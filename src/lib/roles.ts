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

const STAFF_ROLES = ["recruitment_officer", "admin", "super_admin"] as const;

export function isStaffRole(role: string): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

/** Staff access wins over a candidate role on the same account. */
export function primaryRole(roles: string[]): string | undefined {
  return roles.find(isStaffRole) ?? roles[0];
}

/** Only allow same-origin relative paths as post-login destinations. */
export function safeRedirect(path: string | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return "/dashboard";
  return path;
}

/** Staff sign-in opens the recruitment area unless a specific page was requested. */
export function homeAfterSignIn(isStaff: boolean, requested?: string): string {
  const target = safeRedirect(requested);
  if (requested && target !== "/dashboard") return target;
  return isStaff ? "/staff" : target;
}
