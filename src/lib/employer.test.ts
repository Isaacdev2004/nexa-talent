import { describe, expect, it } from "vitest";
import { EMPLOYER_JOB_TRANSITIONS, employerApplicantStatuses } from "./employer";

describe("employer access rules", () => {
  it("never lets employers publish vacancies themselves", () => {
    for (const next of Object.values(EMPLOYER_JOB_TRANSITIONS)) expect(next).not.toContain("published");
  });
  it("lets employers close a live vacancy", () => {
    expect(EMPLOYER_JOB_TRANSITIONS["published"]).toEqual(["closed"]);
  });
  it("never lets employers withdraw an applicant", () => {
    expect(employerApplicantStatuses("submitted")).not.toContain("withdrawn");
  });
  it("freezes withdrawn and hired applicants", () => {
    expect(employerApplicantStatuses("withdrawn")).toEqual([]);
    expect(employerApplicantStatuses("hired")).toEqual([]);
  });
});
