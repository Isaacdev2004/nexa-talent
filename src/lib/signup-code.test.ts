import { describe, expect, it } from "vitest";
import { signupCodeMessage } from "./signup-code";

describe("signup code email", () => {
  it("describes the code by its real length", () => {
    const text = signupCodeMessage("94976156");
    expect(text).toContain("9497 6156");
    expect(text).toContain("8-digit");
    expect(text).not.toContain("6-digit");
  });
});
