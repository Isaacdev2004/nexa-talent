/** Employer listing fee charged before a vacancy can be approved. Major-unit cents. */
export const LISTING_FEE_CENTS = 25_000;
export const LISTING_FEE_CURRENCY = "usd";

/** Share of a paid specialist order that is owed to the specialist. The rest is the platform fee. */
export const SPECIALIST_SHARE_BPS = 8_500;

export function commissionAmount(basisCents: number, rateBps: number) {
  if (!Number.isInteger(basisCents) || basisCents < 0) throw new Error("Invalid basis");
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10_000) throw new Error("Invalid rate");
  return Math.floor((basisCents * rateBps) / 10_000);
}

export function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}
