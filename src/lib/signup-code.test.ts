import { describe, expect, it } from "vitest";
import { signupCodeMessage } from "./signup-code";

describe("signup code email", () => {
  it("puts the 6-digit code in the message", () => {
    const text = signupCodeMessage("482915");
    expect(text).toContain("482915");
    expect(text.toLowerCase()).not.toContain("verify");
  });
});
