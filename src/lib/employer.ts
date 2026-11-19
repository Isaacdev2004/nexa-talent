/** Status changes an employer may make on its own vacancies. Publishing is reserved for the recruitment team. */
export const EMPLOYER_JOB_TRANSITIONS: Record<string, string[]> = {
  draft: ["pending_approval", "archived"],
  pending_approval: ["draft", "archived"],
  published: ["closed"],
  closed: ["pending_approval", "archived"],
  archived: [],
};

/** Hiring stages an employer may move an applicant to. Withdrawal belongs to the candidate. */
export function employerApplicantStatuses(current: string): string[] {
  if (current === "withdrawn" || current === "hired") return [];
  return ["under_review", "shortlisted", "interview_scheduled", "interviewed", "offered", "hired", "rejected"].filter((s) => s !== current);
}
