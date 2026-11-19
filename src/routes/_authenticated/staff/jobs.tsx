import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { JOB_STATUS_LABELS, JOB_TRANSITIONS, slugify } from "@/lib/staff";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type JobStatus = Database["public"]["Enums"]["job_status"];

export const Route = createFileRoute("/_authenticated/staff/jobs")({ component: StaffJobs });

const empty = { title: "", employer_display_name: "", location: "", country: "", employment_type: "Full-time", work_arrangement: "On-site", department: "", salary_text: "", closing_date: "", description: "" };

function StaffJobs() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<JobRow | "new" | null>(null);
  const { data: jobs = [] } = useQuery({
    queryKey: ["staff-jobs"],
    queryFn: async () => (await supabase.from("jobs").select("*").is("deleted_at", null).order("updated_at", { ascending: false })).data ?? [],
  });
  const { data: counts = {} } = useQuery({
    queryKey: ["staff-job-app-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("job_applications").select("job_id");
      return (data ?? []).reduce<Record<string, number>>((a, r) => ({ ...a, [r.job_id]: (a[r.job_id] ?? 0) + 1 }), {});
    },
  });
  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobStatus }) => {
      const { error } = await supabase.from("jobs").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff-jobs"] }); qc.invalidateQueries({ queryKey: ["jobs"] }); toast.success("Job updated"); },
    onError: (error: Error) => toast.error(error.message || "Couldn't update this job"),
  });
  const shown = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  return (
    <>
      <PageHeader title="Jobs" subtitle="Create vacancies and move them through review and publication." actions={<Button onClick={() => setEditing("new")}><Plus /> New job</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {["all", ...Object.keys(JOB_STATUS_LABELS)].map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>{s === "all" ? "All" : JOB_STATUS_LABELS[s]} ({s === "all" ? jobs.length : jobs.filter((j) => j.status === s).length})</Button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground"><tr><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Applicants</th><th className="p-3">Closes</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-border">
            {shown.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No jobs here yet.</td></tr>}
            {shown.map((j) => (
              <tr key={j.id}>
                <td className="p-3"><p className="font-medium">{j.title}{j.is_demo && <span className="ml-2 rounded bg-muted px-1.5 text-xs">Demo</span>}</p><p className="text-muted-foreground">{j.employer_display_name} · {j.location}</p></td>
                <td className="p-3">{JOB_STATUS_LABELS[j.status]}</td>
                <td className="p-3">{counts[j.id] ?? 0}</td>
                <td className="p-3">{j.closing_date ?? "—"}</td>
                <td className="p-3"><div className="flex flex-wrap justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(j)}>Edit</Button>
                  {j.status === "published" && !j.is_demo && (
                    <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/jobs/${j.slug}`).then(() => toast.success("Job link copied"), () => toast.error("Couldn't copy the link"))}>Copy link</Button>
                  )}
                  {(JOB_TRANSITIONS[j.status] ?? []).map((s) => (
                    <Button key={s} size="sm" variant={s === "published" ? "default" : "outline"} disabled={move.isPending} onClick={() => move.mutate({ id: j.id, status: s as JobStatus })}>
                      {s === "published" ? (j.status === "closed" ? "Reopen" : "Publish") : s === "pending_approval" ? "Submit for approval" : s === "draft" ? "Back to draft" : JOB_STATUS_LABELS[s]}
                    </Button>
                  ))}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <JobDialog job={editing} userId={user?.id} onClose={() => setEditing(null)} />
    </>
  );
}

function JobDialog({ job, userId, onClose }: { job: JobRow | "new" | null; userId: string | undefined; onClose: () => void }) {
  const qc = useQueryClient();
  const initial = job && job !== "new" ? Object.fromEntries(Object.keys(empty).map((k) => [k, (job as Record<string, unknown>)[k] ?? ""])) as typeof empty : empty;
  const [f, setF] = useState(initial);
  const [key, setKey] = useState<unknown>(null);
  if (key !== job) { setKey(job); setF(initial); }
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (f.title.trim().length < 3 || !f.employer_display_name.trim() || !f.location.trim() || !f.country.trim() || f.description.trim().length < 50) { toast.error("Fill in title, employer, location, country and a description of at least 50 characters."); return; }
    setBusy(true);
    const payload = { ...f, department: f.department || null, salary_text: f.salary_text || null, closing_date: f.closing_date || null };
    const { error } = job === "new"
      ? await supabase.from("jobs").insert({ ...payload, slug: slugify(f.title, f.location), created_by: userId!, status: "draft" })
      : await supabase.from("jobs").update(payload).eq("id", (job as JobRow).id);
    setBusy(false);
    if (error) { toast.error("Couldn't save the job"); return; }
    qc.invalidateQueries({ queryKey: ["staff-jobs"] }); qc.invalidateQueries({ queryKey: ["jobs"] });
    toast.success(job === "new" ? "Draft created" : "Job saved"); onClose();
  };

  return (
    <Dialog open={!!job} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{job === "new" ? "New job" : "Edit job"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {([["title", "Job title"], ["employer_display_name", "Employer name shown"], ["location", "City"], ["country", "Country"], ["department", "Department"], ["salary_text", "Salary (optional)"]] as const).map(([k, l]) => (
            <div key={k} className="space-y-1.5"><Label htmlFor={k}>{l}</Label><Input id={k} value={f[k]} onChange={set(k)} maxLength={160} /></div>
          ))}
          <div className="space-y-1.5"><Label htmlFor="et">Employment type</Label><select id="et" value={f.employment_type} onChange={set("employment_type")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{["Full-time", "Part-time", "Contract", "Temporary", "Internship"].map((o) => <option key={o}>{o}</option>)}</select></div>
          <div className="space-y-1.5"><Label htmlFor="wa">Work arrangement</Label><select id="wa" value={f.work_arrangement} onChange={set("work_arrangement")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{["On-site", "Hybrid", "Remote"].map((o) => <option key={o}>{o}</option>)}</select></div>
          <div className="space-y-1.5"><Label htmlFor="cd">Closing date</Label><Input id="cd" type="date" value={f.closing_date} onChange={set("closing_date")} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="desc">Description</Label><Textarea id="desc" rows={10} value={f.description} onChange={set("description")} maxLength={20000} /></div>
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
