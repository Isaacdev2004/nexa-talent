import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { myApplicantsQuery, myCompaniesQuery, myVacanciesQuery } from "@/lib/employer.queries";

export const Route = createFileRoute("/_authenticated/employer/")({ component: EmployerHome });

function EmployerHome() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const status = useQuery({ queryKey: ["account-status", uid], enabled: !!uid, queryFn: async () => (await supabase.from("profiles").select("account_status").eq("id", uid).maybeSingle()).data?.account_status });
  const companies = useQuery({ ...myCompaniesQuery(uid), enabled: !!uid });
  const jobs = useQuery(myVacanciesQuery((companies.data ?? []).map((c) => c.id)));
  const apps = useQuery(myApplicantsQuery((jobs.data ?? []).map((j) => j.id)));
  const stats = [
    { label: "Live vacancies", value: (jobs.data ?? []).filter((j) => j.status === "published").length },
    { label: "Awaiting approval", value: (jobs.data ?? []).filter((j) => j.status === "pending_approval").length },
    { label: "Applicants", value: (apps.data ?? []).length },
    { label: "New applicants", value: (apps.data ?? []).filter((a) => a.status === "submitted").length },
  ];
  return (
    <>
      <PageHeader title="Employer workspace" subtitle="Your company, vacancies and applicants in one place." />
      {status.data && status.data !== "active" && (
        <div className="mb-6 flex gap-3 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm"><Clock className="h-5 w-5 shrink-0 text-warning" />Your account isn't active yet, so you can't post vacancies or view applicants.</div>
      )}
      {companies.data?.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8">
          <h2 className="text-lg font-semibold">Start with your company profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">Vacancies are always posted under a company you manage.</p>
          <Button asChild className="mt-5"><Link to="/employer/company">Create company profile</Link></Button>
        </div>
      ) : (
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => <div key={s.label} className="bg-surface p-6"><p className="text-3xl font-bold text-primary">{s.value}</p><p className="mt-1 text-sm text-muted-foreground">{s.label}</p></div>)}
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link to="/employer/vacancies">Manage vacancies</Link></Button>
        <Button asChild variant="outline"><Link to="/employer/applicants">Review applicants</Link></Button>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">New and reopened vacancies are checked by the NexaTalent recruitment team before they go live.</p>
    </>
  );
}
