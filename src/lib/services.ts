export type QuoteItem = { description: string; amount: number };
export type Agreement = {
  service_name: string;
  scope: string;
  deliverables: string;
  items: QuoteItem[];
  amount: number;
  currency: string;
  delivery_days: number;
  revisions: number;
  exclusions: string;
  terms: string;
  expires_at: string;
};
export function quoteTotal(items: QuoteItem[]) {
  return items.reduce((sum, i) => sum + Math.round(i.amount * 100), 0) / 100;
}
export function canAcceptQuote(status: string, expires: string, now = Date.now()) {
  return status === "sent" && Date.parse(expires) > now;
}
export function orderActions(
  status: string,
  actor: "candidate" | "specialist" | "staff",
  revisionsUsed: number,
  included: number,
) {
  if (actor === "staff") return [];
  if (actor === "candidate") {
    if (status === "awaiting_payment") return ["cancelled"];
    if (status === "submitted_for_review")
      return ["completed", ...(revisionsUsed < included ? ["revision_requested"] : []), "disputed"];
    return ["paid", "in_progress", "awaiting_candidate_information", "revision_requested"].includes(
      status,
    )
      ? ["disputed"]
      : [];
  }
  if (["paid", "awaiting_candidate_information"].includes(status)) return ["in_progress"];
  if (status === "revision_requested") return ["in_progress", "awaiting_candidate_information"];
  return status === "in_progress" ? ["awaiting_candidate_information"] : [];
}
export function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
export const statusLabel = (status: string) => status.replaceAll("_", " ");
