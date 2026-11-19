import { describe, expect, it } from "vitest";
import { commissionAmount, LISTING_FEE_CENTS, SPECIALIST_SHARE_BPS } from "./finance";

describe("commissionAmount", () => {
  it("keeps 85 percent of a specialist order for the specialist", () => {
    expect(commissionAmount(10_000, SPECIALIST_SHARE_BPS)).toBe(8_500);
  });

  it("applies a recruiter rate to a placement value", () => {
    expect(commissionAmount(200_000, 1_500)).toBe(30_000);
  });

  it("rounds down partial cents", () => {
    expect(commissionAmount(1, 1_500)).toBe(0);
  });

  it("rejects a rate above 100 percent", () => {
    expect(() => commissionAmount(100, 10_001)).toThrow("Invalid rate");
  });
});

describe("listing fee", () => {
  it("is a positive charge", () => {
    expect(LISTING_FEE_CENTS).toBeGreaterThan(0);
  });
});
