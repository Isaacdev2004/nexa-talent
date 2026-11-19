import type { PublicJob } from "./jobs";

export const PUBLIC_JOB_COLUMNS = "slug, title, employer_display_name, department, description, location, country, employment_type, work_arrangement, salary_text, closing_date, is_demo";

type Row = { slug: string; title: string; employer_display_name: string; department: string | null; description: string | null; location: string; country: string; employment_type: string; work_arrangement: string; salary_text: string | null; closing_date: string | null; is_demo: boolean };

/** Explicit whitelist: anything not listed (e.g. published_at) never reaches the browser. */
export function toPublicJob(r: Row): PublicJob {
  const j: PublicJob = {
    slug: r.slug, title: r.title, employer: r.employer_display_name, department: r.department ?? "",
    location: r.location, country: r.country, employmentType: r.employment_type, arrangement: r.work_arrangement,
    isDemo: r.is_demo,
  };
  if (r.description) j.description = r.description;
  if (r.salary_text) j.salary = r.salary_text;
  if (r.closing_date) j.closingDate = r.closing_date;
  return j;
}
