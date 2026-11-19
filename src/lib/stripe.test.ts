import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyStripeSignature } from "./stripe";

describe("verifyStripeSignature", () => {
  it("accepts a current signature and rejects a tampered body", () => {
    const secret = "whsec_test";
    const payload = '{"id":"evt_1"}';
    const timestamp = 1_700_000_000;
    const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
    const header = `t=${timestamp},v1=${signature}`;
    expect(verifyStripeSignature(payload, header, secret, timestamp * 1000)).toBe(true);
    expect(verifyStripeSignature(payload + "x", header, secret, timestamp * 1000)).toBe(false);
  });
});
