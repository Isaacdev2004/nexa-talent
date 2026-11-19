import { describe, expect, it } from "vitest";
import { SELF_SERVICE_ACCOUNT_TYPES, homeAfterSignIn, primaryRole, safeRedirect } from "./roles";

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
  it("opens the recruitment area for a staff sign-in", () => {
    expect(primaryRole(["candidate", "super_admin"])).toBe("super_admin");
    expect(homeAfterSignIn(true)).toBe("/staff");
    expect(homeAfterSignIn(true, "/dashboard")).toBe("/staff");
    expect(homeAfterSignIn(true, "/jobs/example")).toBe("/jobs/example");
    expect(homeAfterSignIn(false)).toBe("/dashboard");
  });
});
