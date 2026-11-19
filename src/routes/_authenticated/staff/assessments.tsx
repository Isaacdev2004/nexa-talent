import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Save, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { ASSESSMENT_CATEGORIES, ASSESSMENT_OUTCOMES, canPublishAssessment } from "@/lib/assessment";
import { suggestAssessment } from "@/lib/assessment-ai.functions";
import { openDocument, type JobSnapshot } from "@/lib/candidate";
import { AssessmentReport } from "@/components/app/AssessmentReport";

export const Route = createFileRoute("/_authenticated/staff/assessments")({ head: () => ({ meta: [{ title: "Assessment review desk — NexaTalent" }, { name: "description", content: "Review resumes, save draft findings and publish candidate assessment reports." }, { property: "og:title", content: "Assessment review desk — NexaTalent" }, { property: "og:description", content: "Human-led resume assessment and reporting." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }), component: ReviewDesk });
type Assessment = Database["public"]["Tables"]["assessments"]["Row"];
function ReviewDesk() {
  const [selected, setSelected] = useState("");
  const reports = useQuery({ queryKey: ["staff-assessments"], queryFn: async () => { const { data, error } = await supabase.from("assessments").select("*").order("requested_at", { ascending: false }).limit(100); if (error) throw error; return data; } });
  const report = reports.data?.find((r) => r.id === selected);
  return <><PageHeader title="Assessment review desk" subtitle="Human-led reviews, grounded in the submitted resume and job." />
    {reports.isError && <p role="alert" className="text-destructive">Could not load reviews. Please refresh.</p>}
    {reports.isLoading && <p>Loading review queue…</p>}
    {reports.data?.length === 0 && <p className="border-t border-border py-10 text-muted-foreground">No assessment requests yet.</p>}
    <div className="grid gap-8 xl:grid-cols-[16rem_1fr]"><div className="divide-y divide-border">{reports.data?.map((r) => <Button key={r.id} variant="ghost" onClick={() => setSelected(r.id)} className={`h-auto w-full justify-start whitespace-normal rounded-none px-2 py-4 text-left ${selected === r.id ? "bg-secondary" : ""}`}><span><span className="block font-semibold">{(r.job_snapshot as JobSnapshot).title}</span><span className="mt-1 block text-xs text-muted-foreground">{r.status} · Candidate {r.candidate_user_id.slice(0, 8)}<br />{r.resume_name}</span></span></Button>)}</div>
    <div className="min-w-0">{report && (report.status === "published" ? <AssessmentReport report={report} /> : <ReviewEditor key={report.id} report={report} />)}</div></div>
  </>;
}
function ReviewEditor({ report }: { report: Assessment }) {
  const qc = useQueryClient();
  const [findings, setFindings] = useState<Record<string, string>>(report.findings as Record<string, string>);
  const [recommendations, setRecommendations] = useState(report.recommendations);
  const [missing, setMissing] = useState(report.missing_requirements);
  const [supporting, setSupporting] = useState(report.supporting_documents);
  const [outcome, setOutcome] = useState(report.outcome ?? "");
  const save = useMutation({ mutationFn: async (publish: boolean) => { const { error } = await supabase.rpc("save_assessment", { _id: report.id, _findings: findings, _recommendations: recommendations, _missing: missing, _supporting: supporting, _outcome: outcome || "Further review required", _publish: publish }); if (error) throw error; return publish; }, onSuccess: (published) => { qc.invalidateQueries({ queryKey: ["staff-assessments"] }); qc.invalidateQueries({ queryKey: ["assessments"] }); toast.success(published ? "Report published to candidate" : "Draft saved"); }, onError: (e: Error) => toast.error(e.message) });
  const suggest = useMutation({ mutationFn: () => suggestAssessment({ data: { id: report.id } }), onSuccess: (draft) => { setFindings(draft.findings); setRecommendations(draft.recommendations); setMissing(draft.missing); setSupporting(draft.supporting); setOutcome(draft.outcome); toast.success("Suggestions added. Review them before publishing."); }, onError: (e: Error) => toast.error(e.message) });
  return <div><h2 className="text-xl font-semibold text-primary">{(report.job_snapshot as JobSnapshot).title}</h2><p className="mt-1 text-xs text-muted-foreground">Application {report.application_id} · Candidate {report.candidate_user_id}</p><Button className="my-4" variant="outline" onClick={() => openDocument(report.resume_path).catch(() => toast.error("Could not open resume"))}><FileText />Open submitted resume</Button>
    <div className="grid gap-5 md:grid-cols-2">{ASSESSMENT_CATEGORIES.map((c) => <label key={c} className="space-y-2 text-sm font-medium"><span>{c}</span><Textarea rows={3} value={findings[c] ?? ""} onChange={(e) => setFindings({ ...findings, [c]: e.target.value })} /></label>)}</div>
    <div className="mt-6 space-y-5">{[["Recommendations", recommendations, setRecommendations], ["Missing requirements", missing, setMissing], ["Supporting documents", supporting, setSupporting]].map(([label, value, setter]) => <label key={String(label)} className="block space-y-2 text-sm font-medium"><span>{String(label)}</span><Textarea rows={3} value={String(value)} onChange={(e) => { if (typeof setter === "function") setter(e.target.value); }} /></label>)}
      <label className="block space-y-2 text-sm font-medium"><span>Final assessment outcome</span><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={outcome} onChange={(e) => setOutcome(e.target.value)}><option value="">Choose outcome</option>{ASSESSMENT_OUTCOMES.map((o) => <option key={o}>{o}</option>)}</select></label>
      <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={suggest.isPending} onClick={() => suggest.mutate()}>Suggest scores</Button><Button variant="outline" disabled={save.isPending} onClick={() => save.mutate(false)}><Save />Save draft</Button><Button disabled={save.isPending || !canPublishAssessment(findings, recommendations, outcome)} onClick={() => { if (window.confirm("Publish this report? Published reports cannot be edited.")) save.mutate(true); }}><Send />Publish report</Button></div>
    </div></div>;
}