import { describe, expect, it } from "vitest";
import { SELF_SERVICE_ACCOUNT_TYPES, safeRedirect } from "./roles";

describe("account rules", () => {
  it("never lets people pick staff roles at signup", () => {
    expect(SELF_SERVICE_ACCOUNT_TYPES).toEqual(["candidate", "employer", "recruiter", "specialist"]);
  });
  it("only redirects to same-site paths after sign in", () => {
    expect(safeRedirect("https://evil.com")).toBe("/dashboard");
    expect(safeRedirect("//evil.com")).toBe("/dashboard");
    expect(safeRedirect("/jobs")).toBe("/jobs");
    expect(safeRedirect(undefined)).toBe("/dashboard");
  });
});
