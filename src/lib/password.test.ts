import { describe, expect, it } from "vitest";
import { passwordProblem } from "./password";

describe("new password rules", () => {
  it("rejects the temporary password and short ones", () => {
    expect(passwordProblem("Admin@123")).not.toBeNull();
    expect(passwordProblem("LongerPassword1", "LongerPassword1")).not.toBeNull();
  });
  it("accepts a strong new password", () => {
    expect(passwordProblem("Teal-Harbour-2026", "Admin@123")).toBeNull();
  });
});
