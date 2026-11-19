import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/staff/")({ component: Overview });

async function count(q: PromiseLike<{ count: number | null }>) { return (await q).count ?? 0; }

function Overview() {
  const { data } = useQuery({
    queryKey: ["staff-overview"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [published, pending, newApps, inProgress, interested, enquiries, followUps] = await Promise.all([
        count(supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "published").is("deleted_at", null)),
        count(supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending_approval").is("deleted_at", null)),
        count(supabase.from("job_applications").select("id", { count: "exact", head: true }).eq("status", "submitted")),
        count(supabase.from("job_applications").select("id", { count: "exact", head: true }).in("status", ["under_review", "shortlisted", "interview_scheduled", "interviewed", "offered"])),
        count(supabase.from("candidate_opportunities").select("id", { count: "exact", head: true }).eq("status", "interested")),
        count(supabase.from("contact_enquiries").select("id", { count: "exact", head: true }).eq("status", "new")),
        count(supabase.from("outreach_records").select("id", { count: "exact", head: true }).lte("follow_up_on", today).eq("outcome", "follow_up")),
      ]);
      return { published, pending, newApps, inProgress, interested, enquiries, followUps };
    },
  });
  const tiles = [
    { label: "Published jobs", v: data?.published, to: "/staff/jobs" },
    { label: "Jobs awaiting approval", v: data?.pending, to: "/staff/jobs" },
    { label: "New applications", v: data?.newApps, to: "/staff/applications" },
    { label: "Applications in progress", v: data?.inProgress, to: "/staff/applications" },
    { label: "Interested candidates", v: data?.interested, to: "/staff/opportunities" },
    { label: "Follow-ups due", v: data?.followUps, to: "/staff/outreach" },
    { label: "New enquiries", v: data?.enquiries, to: "/staff/enquiries" },
  ] as const;
  return (
    <>
      <PageHeader title="Recruitment overview" subtitle="What needs attention today." />
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className="bg-surface p-5 hover:bg-muted/50">
            <p className="font-display text-3xl font-bold text-primary">{t.v ?? "–"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.label}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
