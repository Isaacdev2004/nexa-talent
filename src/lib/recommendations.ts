import type { PublicJob } from "./jobs";

export type CandidatePreferences = {
  skills?: string[] | null | undefined;
  preferredTitles?: string[] | null | undefined;
  preferredLocations?: string[] | null | undefined;
  employmentTypes?: string[] | null | undefined;
  workArrangement?: string | null | undefined;
  country?: string | null | undefined;
};

export type ScoredJob = { job: PublicJob; score: number; reasons: string[] };

function tokens(values: Array<string | null | undefined>) {
  return values
    .flatMap((value) => (value ?? "").toLowerCase().split(/[^a-z0-9+#.]+/))
    .filter((token) => token.length > 2);
}

/** Rank open jobs against a candidate profile. A score of 0 means no overlap. */
export function recommendJobs(jobs: PublicJob[], prefs: CandidatePreferences, limit = 5): ScoredJob[] {
  const skills = tokens(prefs.skills ?? []);
  const titles = tokens(prefs.preferredTitles ?? []);
  const places = tokens([...(prefs.preferredLocations ?? []), prefs.country]);
  return jobs
    .filter((job) => !job.isDemo)
    .map((job) => {
      const haystack = tokens([job.title, job.department, job.description, job.employer]);
      const reasons: string[] = [];
      let score = 0;
      const skillHits = skills.filter((skill) => haystack.includes(skill));
      if (skillHits.length) {
        score += skillHits.length * 3;
        reasons.push(`Skills: ${skillHits.slice(0, 3).join(", ")}`);
      }
      const titleHits = titles.filter((title) => haystack.includes(title) || job.title.toLowerCase().includes(title));
      if (titleHits.length) {
        score += 4;
        reasons.push("Matches a title you want");
      }
      if (prefs.employmentTypes?.includes(job.employmentType)) {
        score += 2;
        reasons.push(job.employmentType);
      }
      if (prefs.workArrangement && prefs.workArrangement !== "Any" && prefs.workArrangement === job.arrangement) {
        score += 2;
        reasons.push(job.arrangement);
      }
      const placeHit = places.some((place) => [job.location, job.country].join(" ").toLowerCase().includes(place));
      if (placeHit) {
        score += 2;
        reasons.push(job.location);
      }
      return { job, score, reasons };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.job.title.localeCompare(b.job.title))
    .slice(0, limit);
}
