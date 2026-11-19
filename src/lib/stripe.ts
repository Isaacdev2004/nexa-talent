import { createHmac, timingSafeEqual } from "node:crypto";

/** Stripe signature check. Rejects signatures older than five minutes. */
export function verifyStripeSignature(payload: string, header: string, secret: string, now = Date.now()) {
  if (!secret || !header) return false;
  const fields = new Map<string, string[]>();
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);
    if (!key || !value) continue;
    fields.set(key, [...(fields.get(key) ?? []), value]);
  }
  const timestamp = Number(fields.get("t")?.[0]);
  const signatures = fields.get("v1") ?? [];
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp * 1000) > 5 * 60 * 1000) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const expectedBuf = Buffer.from(expected);
  return signatures.some((signature) => {
    const given = Buffer.from(signature);
    return given.length === expectedBuf.length && timingSafeEqual(given, expectedBuf);
  });
}

export async function stripePost(path: string, params: Record<string, string>) {
  const secret = process.env["STRIPE_SECRET_KEY"];
  if (!secret) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const json = (await response.json()) as { error?: { message?: string }; url?: string; id?: string; payment_intent?: string };
  if (!response.ok) throw new Error(json.error?.message || "Stripe request failed");
  return json;
}

export function checkoutOrigin(origin: string) {
  const url = new URL(origin);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !local) throw new Error("Checkout must start from the secure site address");
  return url.origin;
}
