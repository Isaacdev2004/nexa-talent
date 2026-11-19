import { describe, expect, it } from "vitest";
import { canAcceptQuote, orderActions, quoteTotal } from "./services";
describe("specialist service rules", () => {
  it("records itemised totals to currency precision", () =>
    expect(
      quoteTotal([
        { description: "Review", amount: 10.1 },
        { description: "Rewrite", amount: 20.2 },
      ]),
    ).toBe(30.3));
  it("rejects acceptance at and after expiry", () => {
    const expiry = "2026-11-15T00:00:00Z";
    expect(canAcceptQuote("sent", expiry, Date.parse(expiry) - 1)).toBe(true);
    expect(canAcceptQuote("sent", expiry, Date.parse(expiry))).toBe(false);
  });
  it("cannot accept a quotation twice", () =>
    expect(canAcceptQuote("accepted", "2030-01-01", 0)).toBe(false));
  it("does not start unpaid work", () => {
    expect(orderActions("awaiting_payment", "specialist", 0, 2)).toEqual([]);
    expect(orderActions("paid", "specialist", 0, 2)).toContain("in_progress");
  });
  it("limits revision requests to the agreed allowance", () => {
    expect(orderActions("submitted_for_review", "candidate", 1, 2)).toContain("revision_requested");
    expect(orderActions("submitted_for_review", "candidate", 2, 2)).not.toContain(
      "revision_requested",
    );
  });
  it("only candidates can complete a delivered order", () => {
    expect(orderActions("submitted_for_review", "candidate", 0, 1)).toContain("completed");
    expect(orderActions("submitted_for_review", "specialist", 0, 1)).not.toContain("completed");
  });
  it("closed orders have no normal transitions", () =>
    expect(orderActions("completed", "candidate", 0, 1)).toEqual([]));
});
