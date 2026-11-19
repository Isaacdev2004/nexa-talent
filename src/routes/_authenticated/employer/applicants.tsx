import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { statusLabels } from "@/lib/candidate";
import { emailApplicationStatus } from "@/lib/email.functions";
import { employerApplicantStatuses } from "@/lib/employer";
import { myApplicantsQuery, myCompaniesQuery, myVacanciesQuery } from "@/lib/employer.queries";

type AppStatus = Database["public"]["Enums"]["application_status"];
type Snapshot = { full_name?: string; email?: string; city?: string; country?: string; current_position?: string; years_experience?: number; summary?: string; skills?: string[] };
export const Route = createFileRoute("/_authenticated/employer/applicants")({ component: Applicants });

function Applicants() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const qc = useQueryClient();
  const companies = useQuery({ ...myCompaniesQuery(uid), enabled: !!uid });
  const jobs = useQuery(myVacanciesQuery((companies.data ?? []).map((c) => c.id)));
  const apps = useQuery(myApplicantsQuery((jobs.data ?? []).map((j) => j.id)));
  const [job, setJob] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppStatus }) => {
      const { error } = await supabase.rpc("employer_set_application_status", { _id: id, _status: status });
      if (error) throw error;
      return id;
    },
    onSuccess: async (id) => {
      qc.invalidateQueries({ queryKey: ["employer-applicants"] });
      const mail = await emailApplicationStatus({ data: { applicationId: id } }).catch(() => null);
      if (mail?.sent) toast.success("Applicant updated and the candidate was emailed");
      else if (mail?.waiting) toast.success("Applicant updated. The candidate can see it in their account. Email sends once the sender is configured.");
      else if (mail?.failed) toast.error("Applicant updated, but the email could not be sent");
      else toast.success("Applicant updated. The candidate has a notice in their account.");
    },
    onError: () => toast.error("Couldn't update this applicant"),
  });
  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage.from("candidate-documents").createSignedUrl(path, 60);
    if (error || !data) { toast.error("Couldn't open this file"); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  };
  const list = (apps.data ?? []).filter((a) => job === "all" || a.job_id === job);
  return (
    <>
      <PageHeader title="Applicants" subtitle="Only applicants to your own vacancies are shown." />
      <select aria-label="Filter by vacancy" value={job} onChange={(e) => setJob(e.target.value)} className="mb-4 h-10 rounded-md border border-input bg-background px-3 text-sm">
        <option value="all">All vacancies</option>
        {(jobs.data ?? []).map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
      </select>
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {list.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No applicants yet.</li>}
        {list.map((a) => {
          const p = (a.profile_snapshot ?? {}) as Snapshot;
          const next = employerApplicantStatuses(a.status);
          return (
            <li key={a.id} className="p-4">
              <button type="button" onClick={() => setOpen(open === a.id ? null : a.id)} className="flex w-full flex-wrap items-center justify-between gap-3 text-left">
                <span><span className="block font-medium">{p.full_name ?? "Candidate"}</span><span className="text-sm text-muted-foreground">{(a.job_snapshot as { title?: string })?.title} · applied {new Date(a.submitted_at).toLocaleDateString()}</span></span>
                <StatusBadge status={a.status} />
              </button>
              {open === a.id && (
                <div className="mt-4 grid gap-4 border-t border-border pt-4 text-sm md:grid-cols-2">
                  <div className="space-y-1">
                    {p.current_position && <p>{p.current_position}{p.years_experience != null ? ` · ${p.years_experience} yrs` : ""}</p>}
                    <p className="text-muted-foreground">{[p.city, p.country].filter(Boolean).join(", ")}{p.email ? ` · ${p.email}` : ""}</p>
                    {p.summary && <p className="pt-2">{p.summary}</p>}
                    {p.skills && p.skills.length > 0 && <p className="pt-2 text-muted-foreground">Skills: {p.skills.join(", ")}</p>}
                    {a.cover_letter && <p className="whitespace-pre-line pt-2"><span className="font-medium">Cover letter: </span>{a.cover_letter}</p>}
                  </div>
                  <div className="space-y-3">
                    {(a.application_documents ?? []).map((d) => (
                      <Button key={d.id} size="sm" variant="outline" onClick={() => openFile(d.storage_path)}><FileText /> {d.file_name}</Button>
                    ))}
                    {next.length > 0 && (
                      <label className="block"><span className="mb-1 block text-muted-foreground">Move to stage</span>
                        <select value="" disabled={move.isPending} onChange={(e) => e.target.value && move.mutate({ id: a.id, status: e.target.value as AppStatus })} className="h-10 w-full rounded-md border border-input bg-background px-3">
                          <option value="">Choose…</option>
                          {next.map((s) => <option key={s} value={s}>{statusLabels[s] ?? s}</option>)}
                        </select>
                      </label>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
