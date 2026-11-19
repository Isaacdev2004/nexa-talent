import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, Clock, FileText, LogOut, Search, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { roleLabels } from "@/lib/roles";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/app/StatusBadge";
import { applicationsQuery, candidateProfileQuery, onboardingProgress, type JobSnapshot } from "@/lib/candidate";
import { jobsQuery } from "@/lib/jobs.queries";
import { recommendJobs } from "@/lib/recommendations";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NexaTalent" }, { name: "description", content: "Your NexaTalent dashboard." }, { property: "og:title", content: "Dashboard — NexaTalent" }, { property: "og:description", content: "Your NexaTalent dashboard." }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

function useAccount(userId: string | undefined) {
  return useQuery({
    queryKey: ["account", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("full_name, email, account_status").eq("id", userId ?? "").maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId ?? ""),
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      return { profile: p.data, roles: (r.data ?? []).map((x) => x.role) };
    },
  });
}

const nextSteps: Record<string, { icon: typeof Search; title: string; body: string }[]> = {
  candidate: [
    { icon: Users, title: "Complete your profile", body: "Step-by-step onboarding arrives in the next stage." },
    { icon: Search, title: "Explore opportunities", body: "Browse open roles around the world." },
    { icon: FileText, title: "Resume library", body: "Upload and manage resume versions." },
  ],
  employer: [
    { icon: Briefcase, title: "Create your company profile", body: "Company setup arrives in the employer stage." },
    { icon: Users, title: "Recruiter-supported hiring", body: "Contact our team about sourcing and screening." },
  ],
};

function Dashboard() {
  const { user, signOut } = useAuth();
  const { data, isLoading, error } = useAccount(user?.id);
  const primaryRole = data?.roles[0];
  const steps = (primaryRole && nextSteps[primaryRole]) ?? [];

  return (
    <section className="container-site py-12">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-8">
        <div>
          <p className="eyebrow text-muted-foreground">Dashboard</p>
          {isLoading ? <Skeleton className="mt-3 h-9 w-64" /> : (
            <h1 className="mt-2 text-3xl font-bold text-primary">Hello{data?.profile?.full_name ? `, ${data.profile.full_name.split(" ")[0]}` : ""}</h1>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {data?.roles.map((r) => <span key={r} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{roleLabels[r] ?? r}</span>)}
          </div>
        </div>
        <Button variant="outline" onClick={signOut}><LogOut /> Sign out</Button>
      </div>

      {error && <p className="mt-8 text-destructive">We couldn't load your account. Please refresh.</p>}

      {data?.profile?.account_status === "pending_review" && (
        <div className="mt-8 flex gap-3 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm">
          <Clock className="h-5 w-5 shrink-0 text-warning" />
          <p>Your {roleLabels[primaryRole ?? ""]?.toLowerCase()} account is waiting for review by our team. We'll email you once it's approved.</p>
        </div>
      )}
      {data?.profile?.account_status === "active" && primaryRole && ["recruitment_officer", "admin", "super_admin"].includes(primaryRole) && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface p-4 text-sm"><span className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-primary" />You have recruitment team access.</span><Button asChild size="sm"><Link to="/staff">Open recruitment CRM</Link></Button></div>
      )}

      {primaryRole === "candidate" && user && <CandidatePanel uid={user.id} />}
      {primaryRole === "specialist" && <div className="mt-8 flex flex-wrap gap-3"><Button asChild><Link to="/specialist">Manage specialist profile</Link></Button><Button asChild variant="outline"><Link to="/specialist-work">Referrals & service orders</Link></Button></div>}
      {primaryRole === "employer" && <div className="mt-8"><Button asChild><Link to="/employer">Open employer workspace</Link></Button></div>}
      {primaryRole === "recruiter" && data?.profile?.account_status === "active" && <div className="mt-8"><Button asChild><Link to="/recruiter">Open recruiter workspace</Link></Button></div>}
      {primaryRole !== "candidate" && primaryRole !== "employer" && steps.length > 0 && (
        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-surface p-6">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      )}
      <div className="mt-8"><Button asChild><Link to="/jobs">Browse opportunities</Link></Button></div>
    </section>
  );
}

function CandidatePanel({ uid }: { uid: string }) {
  const prof = useQuery(candidateProfileQuery(uid));
  const apps = useQuery(applicationsQuery(uid));
  const notes = useQuery({
    queryKey: ["notifications", uid],
    queryFn: async () => (await supabase.from("notifications").select("id, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(5)).data ?? [],
  });
  const step = prof.data?.candidate?.onboarding_step ?? 1;
  const pct = onboardingProgress(step);
  const jobs = useQuery(jobsQuery({ limit: 100 }));
  const matches = recommendJobs(jobs.data ?? [], {
    skills: prof.data?.candidate?.skills,
    preferredTitles: prof.data?.candidate?.preferred_titles,
    preferredLocations: prof.data?.candidate?.preferred_locations,
    employmentTypes: prof.data?.candidate?.employment_types,
    workArrangement: prof.data?.candidate?.work_arrangement,
    country: prof.data?.profile?.country,
  });
  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-8">
        {pct < 100 && (
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Complete your profile</h2><span className="text-sm text-muted-foreground">{pct}%</span></div>
            <Progress value={pct} className="mt-3 h-2" />
            <Button asChild className="mt-5"><Link to="/onboarding">{step > 1 ? "Continue setup" : "Start setup"}</Link></Button>
          </div>
        )}
        {matches.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold">Suggested for you</h2>
            <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
              {matches.map((match) => (
                <li key={match.job.slug}><Link to="/jobs/$slug" params={{ slug: match.job.slug }} className="block p-4 hover:bg-muted/50"><span className="font-medium">{match.job.title}</span><span className="mt-1 block text-sm text-muted-foreground">{match.job.employer} · {match.reasons.join(" · ")}</span></Link></li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Recent applications</h2><Link to="/applications" className="text-sm text-primary">View all</Link></div>
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
            {(apps.data ?? []).length === 0 && <li className="p-5 text-sm text-muted-foreground">You haven't applied for any roles yet.</li>}
            {(apps.data ?? []).slice(0, 4).map((a) => { const j = a.job_snapshot as JobSnapshot; return (
              <li key={a.id}><Link to="/applications/$id" params={{ id: a.id }} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50"><span><span className="block font-medium">{j.title}</span><span className="text-sm text-muted-foreground">{j.employer}</span></span><StatusBadge status={a.status} /></Link></li>
            ); })}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          {pct === 100 && <Button asChild variant="outline"><Link to="/onboarding">Edit profile</Link></Button>}
          <Button asChild variant="outline"><Link to="/documents">Resume library</Link></Button>
          <Button asChild variant="outline"><Link to="/opportunities">Shared opportunities</Link></Button>
          <Button asChild variant="outline"><Link to="/assessments">Resume assessments</Link></Button>
          <Button asChild variant="outline"><Link to="/my-services">Specialist services</Link></Button>
        </div>
      </div>
      <aside>
        <h2 className="text-lg font-semibold">Notifications</h2>
        <ul className="mt-3 space-y-3">
          {(notes.data ?? []).length === 0 && <li className="text-sm text-muted-foreground">Nothing new.</li>}
          {(notes.data ?? []).map((n) => (
            <li key={n.id} className="rounded-md border border-border bg-surface p-3 text-sm"><p className="font-medium">{n.title}</p>{n.body && <p className="text-muted-foreground">{n.body}</p>}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
