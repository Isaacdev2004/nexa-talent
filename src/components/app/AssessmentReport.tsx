import { FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Database } from "@/integrations/supabase/types";
import { ASSESSMENT_CATEGORIES } from "@/lib/assessment";
import { openDocument, type JobSnapshot } from "@/lib/candidate";

type Assessment = Database["public"]["Tables"]["assessments"]["Row"];
export function AssessmentReport({ report }: { report: Assessment }) {
  const job = report.job_snapshot as JobSnapshot;
  const findings = report.findings as Record<string, string>;
  return <article className="border-t border-border py-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow text-muted-foreground">{report.status === "published" ? "Published assessment" : "Awaiting review"}</p><h2 className="mt-2 text-xl font-semibold text-primary">{job.title}</h2><p className="text-sm text-muted-foreground">{job.employer} · {job.location}</p></div>
      <Button variant="outline" size="sm" onClick={() => openDocument(report.resume_path).catch(() => toast.error("Could not open resume"))}><FileText />{report.resume_name}</Button>
    </div>
    {report.status === "published" ? <>
      <div className="my-5 border-l-2 border-primary pl-4"><p className="font-semibold text-primary">{report.outcome}</p><p className="mt-1 text-xs text-muted-foreground">Human-reviewed · {report.published_at ? new Date(report.published_at).toLocaleDateString() : ""} · Reviewer reference {report.reviewer_id?.slice(0, 8)}</p></div>
      <dl className="grid gap-x-8 md:grid-cols-2">{ASSESSMENT_CATEGORIES.map((c) => <div key={c} className="border-b border-border py-4"><dt className="text-sm font-semibold">{c}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{findings[c]}</dd></div>)}</dl>
      {[['Recommendations', report.recommendations], ['Missing requirements', report.missing_requirements], ['Supporting documents', report.supporting_documents]].map(([title, body]) => body && <div key={title} className="mt-6"><h3 className="font-semibold">{title}</h3><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{body}</p></div>)}
    </> : <p className="mt-5 text-sm text-muted-foreground">Requested {new Date(report.requested_at).toLocaleDateString()}. Your report will appear here when our team publishes it.</p>}
  </article>;
}