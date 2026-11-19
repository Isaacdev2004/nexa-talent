import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/app/StatusBadge";
import { useAuth } from "@/hooks/use-auth";
import { applicationsQuery, statusLabels, type JobSnapshot } from "@/lib/candidate";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/applications/")({
  head: () => ({ meta: [{ title: "My applications — NexaTalent" }, { name: "description", content: "Track your applications." }, { property: "og:title", content: "My applications — NexaTalent" }, { property: "og:description", content: "Track your applications." }, { name: "robots", content: "noindex" }] }),
  component: Applications,
});

function Applications() {
  const { user } = useAuth();
  const { data = [], isLoading } = useQuery(applicationsQuery(user!.id));
  const [filter, setFilter] = useState("all");
  const shown = filter === "all" ? data : data.filter((a) => a.status === filter);
  const present = Array.from(new Set(data.map((a) => a.status)));
  return (
    <section className="container-site py-12">
      <p className="eyebrow text-muted-foreground">Applications</p>
      <h1 className="mt-2 text-3xl font-bold text-primary">My applications</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        {["all", ...present].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={cn("rounded-full border px-3 py-1 text-sm", filter === s ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
            {s === "all" ? `All (${data.length})` : statusLabels[s]}
          </button>
        ))}
      </div>
      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-surface">
        {isLoading ? <Skeleton className="h-40" /> : shown.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No applications yet. <Button asChild variant="link"><Link to="/jobs">Find a role</Link></Button></div>
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((a) => { const j = a.job_snapshot as JobSnapshot; return (
              <li key={a.id}><Link to="/applications/$id" params={{ id: a.id }} className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-muted/50">
                <div><p className="font-semibold">{j.title}</p><p className="text-sm text-muted-foreground">{j.employer} · {j.location}</p></div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground"><span>Applied {new Date(a.submitted_at).toLocaleDateString("en-GB")}</span><StatusBadge status={a.status} /></div>
              </Link></li>
            ); })}
          </ul>
        )}
      </div>
    </section>
  );
}
