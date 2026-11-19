import { queryOptions } from "@tanstack/react-query";
import { getPublishedJob, listPublishedJobs } from "./jobs.functions";

export type JobFilters = { q?: string; location?: string; type?: string; arrangement?: string; limit?: number };

export const jobsQuery = (f: JobFilters = {}) => {
  const data: JobFilters = {};
  for (const k of ["q", "location", "type", "arrangement", "limit"] as const) if (f[k]) (data as Record<string, unknown>)[k] = f[k];
  return queryOptions({ queryKey: ["jobs", data], queryFn: () => listPublishedJobs({ data }) });
};

export const jobQuery = (slug: string) => queryOptions({ queryKey: ["job", slug], queryFn: () => getPublishedJob({ data: { slug } }) });
