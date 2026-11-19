import { describe, expect, it } from "vitest";
import { ASSESSMENT_CATEGORIES, ASSESSMENT_OUTCOMES, canPublishAssessment, canReadAssessment, canReviewSpecialist } from "./assessment";

describe("human-reviewed assessments", () => {
  it("requires findings in all ten review categories before publication", () => {
    const findings = Object.fromEntries(ASSESSMENT_CATEGORIES.map((c) => [c, "Reviewed against the submitted role"]));
    expect(ASSESSMENT_CATEGORIES).toHaveLength(10);
    expect(canPublishAssessment(findings, "No improvements required", "Suitable")).toBe(true);
    delete findings["Required skills"];
    expect(canPublishAssessment(findings, "No improvements required", "Suitable")).toBe(false);
  });
  it("requires recommendations and a legitimate assessment outcome", () => {
    const findings = Object.fromEntries(ASSESSMENT_CATEGORIES.map((c) => [c, "Reviewed"]));
    expect(canPublishAssessment(findings, "", "Suitable")).toBe(false);
    expect(canPublishAssessment(findings, "Keep current version", "Guaranteed hire")).toBe(false);
    expect(ASSESSMENT_OUTCOMES).toHaveLength(6);
  });
  it("keeps draft reports private to staff", () => {
    expect(canReadAssessment(true, false, "draft")).toBe(false);
    expect(canReadAssessment(true, false, "published")).toBe(true);
    expect(canReadAssessment(false, false, "published")).toBe(false);
    expect(canReadAssessment(false, true, "draft")).toBe(true);
  });
  it("requires administrator approval for specialist activation", () => {
    expect(canReviewSpecialist(["specialist"])).toBe(false);
    expect(canReviewSpecialist(["recruitment_officer"])).toBe(false);
    expect(canReviewSpecialist(["admin"])).toBe(true);
    expect(canReviewSpecialist(["super_admin"])).toBe(true);
  });
});