export const SELF_SERVICE_ACCOUNT_TYPES = ["candidate", "employer", "recruiter", "specialist"] as const;
export type AccountType = (typeof SELF_SERVICE_ACCOUNT_TYPES)[number];

export const accountTypeLabels: Record<AccountType, { label: string; hint: string }> = {
  candidate: { label: "Candidate", hint: "Find and apply for opportunities" },
  employer: { label: "Employer", hint: "Hire for your organisation" },
  recruiter: { label: "Independent recruiter", hint: "Reviewed before activation" },
  specialist: { label: "Document specialist", hint: "Reviewed before activation" },
};

export const roleLabels: Record<string, string> = {
  candidate: "Candidate",
  employer: "Employer",
  recruiter: "Independent recruiter",
  specialist: "Document specialist",
  recruitment_officer: "Recruitment officer",
  admin: "Administrator",
  super_admin: "Super administrator",
};

/** Only allow same-origin relative paths as post-login destinations. */
export function safeRedirect(path: string | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return "/dashboard";
  return path;
}
