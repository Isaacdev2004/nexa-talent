import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardCheck, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AssessmentReport } from "@/components/app/AssessmentReport";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { applicationsQuery, type JobSnapshot } from "@/lib/candidate";

export const Route = createFileRoute("/_authenticated/assessments")({
  head: () => ({ meta: [{ title: "My resume assessments — NexaTalent" }, { name: "description", content: "Request and read human-reviewed assessments of your submitted resume." }, { property: "og:title", content: "My resume assessments — NexaTalent" }, { property: "og:description", content: "Your resume assessment reports and recommendations." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Assessments,
});

function Assessments() {
  const { user } = useAuth();
  return user ? <AssessmentWorkspace uid={user.id} /> : null;
}
function AssessmentWorkspace({ uid }: { uid: string }) {
  const qc = useQueryClient();
  const [application, setApplication] = useState("");
  const apps = useQuery(applicationsQuery(uid));
  const reports = useQuery({ queryKey: ["assessments", uid], queryFn: async () => { const { data, error } = await supabase.rpc("my_assessments"); if (error) throw error; return data; } });
  const request = useMutation({ mutationFn: async () => { const { error } = await supabase.rpc("request_assessment", { _application_id: application }); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["assessments"] }); setApplication(""); toast.success("Assessment requested"); }, onError: (e: Error) => toast.error(e.message) });
  const eligible = (apps.data ?? []).filter((a) => !(reports.data ?? []).some((r) => r.application_id === a.id));
  return <section className="container-site max-w-4xl py-12">
    <PageHeader title="Resume assessments" subtitle="A considered review of your resume against the role you applied for." actions={<Button asChild variant="outline"><Link to="/dashboard">Dashboard</Link></Button>} />
    <div className="border-y border-border py-6"><div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" /><h2 className="font-semibold">Request a review</h2></div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row"><label className="flex-1"><span className="sr-only">Submitted application</span><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={application} onChange={(e) => setApplication(e.target.value)}><option value="">Choose a submitted application</option>{eligible.map((a) => <option key={a.id} value={a.id}>{(a.job_snapshot as JobSnapshot).title} — {(a.job_snapshot as JobSnapshot).employer}</option>)}</select></label><Button disabled={!application || request.isPending || reports.isLoading} onClick={() => request.mutate()}><Plus />{request.isPending ? "Requesting…" : "Request assessment"}</Button></div>
      {!apps.isLoading && eligible.length === 0 && <p className="mt-3 text-sm text-muted-foreground">{apps.data?.length ? "Your submitted applications already have review requests." : "Apply for a role first to request a job-specific resume review."}</p>}
      <p className="mt-4 text-xs text-muted-foreground">Assessment is separate from optional paid specialist services. Your job application never depends on buying a service.</p>
    </div>
    {(reports.isError || apps.isError) && <p role="alert" className="mt-5 text-destructive">Could not load assessments. Please refresh.</p>}
    {reports.isLoading && <p className="py-8 text-muted-foreground">Loading assessments…</p>}
    {reports.data?.length === 0 && <div className="py-12"><h2 className="text-lg font-semibold">No reports yet</h2><p className="mt-2 text-sm text-muted-foreground">Your requested reviews and published reports will appear here.</p></div>}
    {reports.data?.map((r) => <AssessmentReport key={r.id} report={r} />)}
  </section>;
}