export const JOB_STATUS_LABELS: Record<string, string> = { draft: "Draft", pending_approval: "Pending approval", published: "Published", closed: "Closed", archived: "Archived" };

/** Allowed next statuses in the job publishing workflow. */
export const JOB_TRANSITIONS: Record<string, string[]> = {
  draft: ["pending_approval", "published", "archived"],
  pending_approval: ["published", "draft", "archived"],
  published: ["closed"],
  closed: ["published", "archived"],
  archived: [],
};

export const APPLICATION_FLOW = ["submitted", "under_review", "shortlisted", "interview_scheduled", "interviewed", "offered", "hired", "rejected"] as const;

export function slugify(title: string, location: string) {
  const base = `${title}-${location}`.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
  return `${base || "role"}-${Math.random().toString(36).slice(2, 6)}`;
}
