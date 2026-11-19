import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MapPin, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JobCard } from "@/components/site/JobCard";
import { jobsQuery } from "@/lib/jobs.queries";
import { cn } from "@/lib/utils";

type JobSearch = { q?: string; location?: string; type?: string; arrangement?: string };
const TYPES = ["Full-time", "Part-time", "Contract", "Temporary", "Internship"];
const ARRANGEMENTS = ["On-site", "Hybrid", "Remote"];

export const Route = createFileRoute("/jobs")({
  validateSearch: (s: Record<string, unknown>): JobSearch => {
    const out: JobSearch = {};
    for (const k of ["q", "location", "type", "arrangement"] as const) {
      const v = s[k];
      if (typeof v === "string" && v) out[k] = v.slice(0, 100);
    }
    return out;
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(jobsQuery(deps)),
  head: () => ({
    meta: [
      { title: "Find jobs — NexaTalent" },
      { name: "description", content: "Search verified job opportunities across countries, industries and work arrangements." },
      { property: "og:title", content: "Find jobs — NexaTalent" },
      { property: "og:description", content: "Search verified job opportunities across countries, industries and work arrangements." },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/jobs" });
  const [kw, setKw] = useState(search.q ?? "");
  const [loc, setLoc] = useState(search.location ?? "");
  const { data: results } = useSuspenseQuery(jobsQuery(search));

  const go = (patch: Partial<JobSearch>) => {
    const next: JobSearch = { ...search, ...patch };
    (Object.keys(next) as (keyof JobSearch)[]).forEach((k) => { if (!next[k]) delete next[k]; });
    navigate({ search: next });
  };
  const submit = (e: FormEvent) => { e.preventDefault(); go({ q: kw.trim() || undefined, location: loc.trim() || undefined } as Partial<JobSearch>); };
  const active = !!(search.q || search.location || search.type || search.arrangement);

  return (
    <>
      <section className="bg-primary text-primary-foreground">
        <div className="container-site py-14">
          <p className="eyebrow text-accent">Opportunities</p>
          <h1 className="mt-3 text-4xl font-bold md:text-5xl">Find your next role</h1>
          <form onSubmit={submit} className="mt-8 grid gap-2 rounded-lg bg-surface p-2 md:grid-cols-[1fr_1fr_auto]">
            <label className="flex items-center gap-2 px-3 text-foreground"><Search className="h-4 w-4 text-muted-foreground" /><Input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Job title or keyword" className="border-0 shadow-none focus-visible:ring-0" aria-label="Keyword" /></label>
            <label className="flex items-center gap-2 px-3 text-foreground md:border-l md:border-border"><MapPin className="h-4 w-4 text-muted-foreground" /><Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="City or country" className="border-0 shadow-none focus-visible:ring-0" aria-label="Location" /></label>
            <Button type="submit" size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">Search</Button>
          </form>
        </div>
      </section>
      <section className="container-site grid gap-10 py-12 lg:grid-cols-[14rem_1fr]">
        <aside className="space-y-6" aria-label="Filters">
          <FilterGroup label="Employment type" options={TYPES} value={search.type} onChange={(v) => go({ type: v } as Partial<JobSearch>)} />
          <FilterGroup label="Work arrangement" options={ARRANGEMENTS} value={search.arrangement} onChange={(v) => go({ arrangement: v } as Partial<JobSearch>)} />
          {active && <Button variant="ghost" size="sm" onClick={() => { setKw(""); setLoc(""); navigate({ search: {} }); }}>Clear all</Button>}
        </aside>
        <div>
          <p className="mb-6 text-sm text-muted-foreground">{results.length} {results.length === 1 ? "opportunity" : "opportunities"}{results.some((j) => j.isDemo) && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">Includes demo listings</span>}</p>
          {results.length ? (
            <div className="grid gap-5 md:grid-cols-2">{results.map((j) => <JobCard key={j.slug} job={j} />)}</div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-surface p-12 text-center text-muted-foreground">No opportunities match your search yet. Try a broader keyword or fewer filters.</div>
          )}
        </div>
      </section>
    </>
  );
}

function FilterGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string | undefined; onChange: (v: string | undefined) => void }) {
  return (
    <fieldset>
      <legend className="eyebrow mb-3 text-muted-foreground">{label}</legend>
      <div className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(value === o ? undefined : o)}
            className={cn("rounded-full border px-3 py-1 text-sm transition-colors", value === o ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40")}>{o}</button>
        ))}
      </div>
    </fieldset>
  );
}
