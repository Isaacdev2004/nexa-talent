// Public job model. Never add a publication date here (brief §2.1).
export type WorkArrangement = "On-site" | "Hybrid" | "Remote";
export type EmploymentType = "Full-time" | "Part-time" | "Contract";

export interface PublicJob {
  slug: string;
  title: string;
  employer: string;
  location: string;
  country: string;
  employmentType: EmploymentType | string;
  arrangement: WorkArrangement | string;
  salary?: string;
  closingDate?: string; // ISO date
  department: string;
  description?: string;
  isDemo?: boolean;
}

export function formatClosingDate(iso?: string) {
  if (!iso) return "Open until filled";
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function filterJobs(jobs: PublicJob[], q?: string, location?: string, type?: string, arrangement?: string) {
  const needle = q?.trim().toLowerCase();
  const loc = location?.trim().toLowerCase();
  return jobs.filter((j) => {
    const textOk = !needle || [j.title, j.employer, j.department ?? ""].some((v) => v.toLowerCase().includes(needle));
    const locOk = !loc || [j.location, j.country, j.arrangement].some((v) => v.toLowerCase().includes(loc));
    const typeOk = !type || j.employmentType === type;
    const arrOk = !arrangement || j.arrangement === arrangement;
    return textOk && locOk && typeOk && arrOk;
  });
}
