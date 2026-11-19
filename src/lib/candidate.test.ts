import { describe, expect, it } from "vitest";
import { canWithdraw, onboardingProgress, validateDocument } from "./candidate";

describe("candidate rules", () => {
  it("accepts only PDF/Word up to 10 MB", () => {
    expect(validateDocument({ type: "application/pdf", size: 1000 })).toBeNull();
    expect(validateDocument({ type: "image/png", size: 1000 })).not.toBeNull();
    expect(validateDocument({ type: "application/pdf", size: 10 * 1024 * 1024 + 1 })).not.toBeNull();
  });
  it("cannot withdraw a closed application", () => {
    expect(canWithdraw("submitted")).toBe(true);
    expect(canWithdraw("hired")).toBe(false);
    expect(canWithdraw("rejected")).toBe(false);
    expect(canWithdraw("withdrawn")).toBe(false);
  });
  it("onboarding progress runs 0 to 100 across five steps", () => {
    expect(onboardingProgress(1)).toBe(0);
    expect(onboardingProgress(6)).toBe(100);
  });
});
