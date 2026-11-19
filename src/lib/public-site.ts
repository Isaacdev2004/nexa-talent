export const PUBLIC_SITE_URL = "https://nexa-talent-one.vercel.app";

export function publicSiteOrigin(currentOrigin?: string, configured?: string) {
  const fromEnv = (configured ?? "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const origin = (currentOrigin ?? "").trim().replace(/\/$/, "");
  if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(origin)) return origin;
  return PUBLIC_SITE_URL;
}
