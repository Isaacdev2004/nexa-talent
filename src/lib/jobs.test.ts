import { describe, expect, it } from "vitest";
import { filterJobs, type PublicJob } from "./jobs";
import { toPublicJob } from "./jobs.mapper";

const row = { slug: "data-engineer-london", title: "Data Engineer", employer_display_name: "Halden", department: "Technology", description: "x", location: "London", country: "United Kingdom", employment_type: "Contract", work_arrangement: "Remote", salary_text: null, closing_date: "2026-12-08", is_demo: true, published_at: "2026-01-01" };

describe("public job model", () => {
  it("never exposes a publication date", () => {
    expect(Object.keys(toPublicJob(row))).not.toContain("publishedAt");
    expect(Object.keys(toPublicJob(row))).not.toContain("published_at");
  });
  it("filters by keyword and location", () => {
    const jobs: PublicJob[] = [toPublicJob(row), toPublicJob({ ...row, slug: "b", title: "Nurse", location: "Toronto", country: "Canada", work_arrangement: "On-site", employment_type: "Full-time" })];
    expect(filterJobs(jobs, "data", "london").map((j) => j.slug)).toEqual(["data-engineer-london"]);
    expect(filterJobs(jobs, "", "remote").length).toBe(1);
    expect(filterJobs(jobs, undefined, undefined, "Contract").map((j) => j.slug)).toEqual(["data-engineer-london"]);
    expect(filterJobs(jobs, undefined, undefined, undefined, "On-site").map((j) => j.slug)).toEqual(["b"]);
  });
});
