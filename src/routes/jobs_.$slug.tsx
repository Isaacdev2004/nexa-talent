import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Briefcase, Building2, CalendarClock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatClosingDate } from "@/lib/jobs";
import { jobQuery } from "@/lib/jobs.queries";

export const Route = createFileRoute("/jobs_/$slug")({
  loader: async ({ context, params }) => {
    const job = await context.queryClient.ensureQueryData(jobQuery(params.slug));
    if (!job) throw notFound();
    return { title: job.title, employer: job.employer, location: job.location };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Opportunity unavailable — NexaTalent" }, { name: "robots", content: "noindex" }] };
    const t = `${loaderData.title} at ${loaderData.employer} — NexaTalent`;
    const d = `${loaderData.title} in ${loaderData.location}. View the role and apply on NexaTalent.`;
    return { meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }, { property: "og:type", content: "article" }] };
  },
  notFoundComponent: () => (
    <section className="container-site py-24">
      <h1 className="text-3xl font-bold text-primary">This opportunity isn't available</h1>
      <p className="mt-3 text-muted-foreground">It may have closed or been removed.</p>
      <Button asChild className="mt-8"><Link to="/jobs">Browse open roles</Link></Button>
    </section>
  ),
  component: JobDetail,
});

function JobDetail() {
  const { slug } = Route.useParams();
  const { data: job } = useSuspenseQuery(jobQuery(slug));
  if (!job) return null;
  return (
    <>
      <section className="bg-primary text-primary-foreground">
        <div className="container-site py-14">
          <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/70 hover:text-accent"><ArrowLeft className="h-4 w-4" /> All opportunities</Link>
          <p className="mt-8 flex items-center gap-2 text-primary-foreground/80"><Building2 className="h-4 w-4" />{job.employer}{job.isDemo && <span className="rounded bg-primary-foreground/10 px-1.5 py-0.5 text-xs">Demo listing</span>}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold md:text-5xl">{job.title}</h1>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-primary-foreground/80">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{job.location}, {job.country}</span>
            <span className="inline-flex items-center gap-1.5"><Briefcase className="h-4 w-4" />{job.employmentType} · {job.arrangement}</span>
            <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />Closes {formatClosingDate(job.closingDate)}</span>
          </div>
        </div>
      </section>
      <section className="container-site grid gap-12 py-14 lg:grid-cols-[1fr_20rem]">
        <article className="max-w-2xl">
          <h2 className="text-xl font-semibold text-primary">About the role</h2>
          <p className="mt-4 whitespace-pre-line leading-relaxed text-foreground/85">{job.description || "Full details are shared by our recruitment team."}</p>
        </article>
        <aside className="h-fit rounded-lg border border-border bg-surface p-6">
          {job.salary && <><p className="eyebrow text-muted-foreground">Salary</p><p className="mt-1 font-semibold">{job.salary}</p></>}
          <Button asChild size="lg" className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/apply/$slug" params={{ slug: job.slug }}>Apply for this role</Link>
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">Applying is always free. You'll be asked to sign in with a candidate account.</p>
        </aside>
      </section>
    </>
  );
}
