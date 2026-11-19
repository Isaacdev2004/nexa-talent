import { describe, expect, it } from "vitest";
import type { PublicJob } from "./jobs";
import { recommendJobs } from "./recommendations";

const jobs: PublicJob[] = [
  { slug: "data-engineer-london", title: "Data Engineer", employer: "Halden", location: "London", country: "United Kingdom", employmentType: "Contract", arrangement: "Remote", department: "Technology", description: "Pipelines and warehouse models", isDemo: false },
  { slug: "nurse-toronto", title: "Clinical Operations Manager", employer: "Northbridge", location: "Toronto", country: "Canada", employmentType: "Full-time", arrangement: "On-site", department: "Healthcare", description: "Patient flow", isDemo: false },
  { slug: "demo-role", title: "Data Engineer", employer: "Sample", location: "London", country: "United Kingdom", employmentType: "Contract", arrangement: "Remote", department: "Technology", description: "warehouse", isDemo: true },
];

describe("recommendJobs", () => {
  it("ranks a skill and location match above an unrelated role and skips demo jobs", () => {
    const ranked = recommendJobs(jobs, {
      skills: ["warehouse", "pipelines"],
      preferredTitles: ["Data Engineer"],
      preferredLocations: ["London"],
      employmentTypes: ["Contract"],
      workArrangement: "Remote",
    });
    expect(ranked.map((row) => row.job.slug)).toEqual(["data-engineer-london"]);
    expect(ranked[0]?.reasons.join(" ")).toContain("warehouse");
  });

  it("returns nothing when the profile does not overlap", () => {
    expect(recommendJobs(jobs, { skills: ["pottery"], preferredTitles: ["Chef"] })).toEqual([]);
  });
});
