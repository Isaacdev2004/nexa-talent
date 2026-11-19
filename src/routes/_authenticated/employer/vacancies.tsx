import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { EMPLOYER_JOB_TRANSITIONS } from "@/lib/employer";
import { formatMoney, LISTING_FEE_CENTS, LISTING_FEE_CURRENCY } from "@/lib/finance";
import { createListingCheckout } from "@/lib/payments.functions";
import { myCompaniesQuery, myVacanciesQuery } from "@/lib/employer.queries";
import { JOB_STATUS_LABELS, slugify } from "@/lib/staff";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type JobStatus = Database["public"]["Enums"]["job_status"];
export const Route = createFileRoute("/_authenticated/employer/vacancies")({ component: Vacancies });

const empty = { title: "", location: "", country: "", employment_type: "Full-time", work_arrangement: "On-site", department: "", salary_text: "", closing_date: "", description: "" };
const actionLabel: Record<string, string> = { pending_approval: "Submit for approval", draft: "Back to draft", closed: "Close", archived: "Archive" };

function Vacancies() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const qc = useQueryClient();
  const companies = useQuery({ ...myCompaniesQuery(uid), enabled: !!uid });
  const company = companies.data?.[0];
  const { data: jobs = [] } = useQuery(myVacanciesQuery((companies.data ?? []).map((c) => c.id)));
  const [editing, setEditing] = useState<JobRow | "new" | null>(null);
  const pay = useMutation({
    mutationFn: async (jobId: string) => {
      const { url } = await createListingCheckout({ data: { jobId } });
      window.location.assign(url);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobStatus }) => {
      const { error } = await supabase.rpc("employer_set_job_status", { _job_id: id, _status: status });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employer-vacancies"] }); toast.success("Vacancy updated"); },
    onError: () => toast.error("Couldn't update this vacancy"),
  });
  if (companies.isSuccess && !company) return (
    <><PageHeader title="Vacancies" /><p className="text-sm text-muted-foreground">Create your <Link to="/employer/company" className="text-primary underline">company profile</Link> before posting vacancies.</p></>
  );
  return (
    <>
      <PageHeader title="Vacancies" subtitle="Draft roles and send them to our team for approval." actions={<Button onClick={() => setEditing("new")} disabled={!company}><Plus /> New vacancy</Button>} />
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {jobs.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No vacancies yet.</li>}
        {jobs.map((j) => (
          <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div><p className="font-medium">{j.title}</p><p className="text-sm text-muted-foreground">{j.location} · {JOB_STATUS_LABELS[j.status]}{j.closing_date ? ` · closes ${j.closing_date}` : ""}</p></div>
            <div className="flex flex-wrap gap-1">
              {["draft", "pending_approval"].includes(j.status) && <Button size="sm" variant="ghost" onClick={() => setEditing(j)}>Edit</Button>}
              {!j.listing_paid_at && j.source === "employer" && ["draft", "pending_approval", "closed"].includes(j.status) && <Button size="sm" disabled={pay.isPending} onClick={() => pay.mutate(j.id)}>Pay {formatMoney(LISTING_FEE_CENTS, LISTING_FEE_CURRENCY)}</Button>}
              {(EMPLOYER_JOB_TRANSITIONS[j.status] ?? []).map((s) => (
                <Button key={s} size="sm" variant={s === "pending_approval" ? "default" : "outline"} disabled={move.isPending} onClick={() => move.mutate({ id: j.id, status: s as JobStatus })}>{j.status === "closed" && s === "pending_approval" ? "Request reopening" : actionLabel[s]}</Button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {company && editing && <VacancyForm job={editing === "new" ? null : editing} companyId={company.id} companyName={company.name} uid={uid} onClose={() => setEditing(null)} />}
    </>
  );
}

function PayListing({ jobId, saveDraft }: { jobId: string | undefined; saveDraft: () => void }) {
  const pay = useMutation({
    mutationFn: async () => {
      if (!jobId) {
        saveDraft();
        throw new Error("Save the vacancy, then pay the listing fee from the list.");
      }
      const { url } = await createListingCheckout({ data: { jobId } });
      window.location.assign(url);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return <Button type="button" disabled={pay.isPending} onClick={() => pay.mutate()}>Pay {formatMoney(LISTING_FEE_CENTS, LISTING_FEE_CURRENCY)} and submit</Button>;
}

function VacancyForm({ job, companyId, companyName, uid, onClose }: { job: JobRow | null; companyId: string; companyName: string; uid: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState(job ? { title: job.title, location: job.location, country: job.country, employment_type: job.employment_type, work_arrangement: job.work_arrangement, department: job.department ?? "", salary_text: job.salary_text ?? "", closing_date: job.closing_date ?? "", description: job.description } : empty);
  const save = useMutation({
    mutationFn: async (submit: boolean) => {
      const values = { title: f.title.trim(), location: f.location.trim(), country: f.country.trim(), employment_type: f.employment_type, work_arrangement: f.work_arrangement, department: f.department.trim() || null, salary_text: f.salary_text.trim() || null, closing_date: f.closing_date || null, description: f.description.trim(), employer_display_name: companyName, company_id: companyId, status: (submit ? "pending_approval" : job?.status ?? "draft") as JobStatus };
      const { error } = job ? await supabase.from("jobs").update(values).eq("id", job.id) : await supabase.from("jobs").insert({ ...values, slug: slugify(values.title, values.location), created_by: uid, source: "employer" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employer-vacancies"] }); toast.success("Vacancy saved"); onClose(); },
    onError: () => toast.error("Couldn't save this vacancy"),
  });
  const go = (submit: boolean) => (e?: FormEvent) => {
    e?.preventDefault();
    if (!f.title.trim() || !f.location.trim() || !f.country.trim() || f.description.trim().length < 50) { toast.error("Add a title, location, country and a description of at least 50 characters"); return; }
    save.mutate(submit);
  };
  const field = (k: keyof typeof empty) => ({ id: k, value: f[k], onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value }) });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{job ? "Edit vacancy" : "New vacancy"}</DialogTitle></DialogHeader>
        <form onSubmit={go(false)} className="grid gap-4">
          <div><Label htmlFor="title">Job title</Label><Input {...field("title")} maxLength={160} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="location">Location</Label><Input {...field("location")} maxLength={120} /></div>
            <div><Label htmlFor="country">Country</Label><Input {...field("country")} maxLength={80} /></div>
            <div><Label htmlFor="employment_type">Employment type</Label><select {...field("employment_type")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{["Full-time", "Part-time", "Contract", "Temporary", "Internship"].map((o) => <option key={o}>{o}</option>)}</select></div>
            <div><Label htmlFor="work_arrangement">Work arrangement</Label><select {...field("work_arrangement")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{["On-site", "Hybrid", "Remote"].map((o) => <option key={o}>{o}</option>)}</select></div>
            <div><Label htmlFor="department">Department</Label><Input {...field("department")} maxLength={120} /></div>
            <div><Label htmlFor="salary_text">Salary (optional)</Label><Input {...field("salary_text")} maxLength={120} /></div>
            <div><Label htmlFor="closing_date">Closing date</Label><Input type="date" {...field("closing_date")} /></div>
          </div>
          <div><Label htmlFor="description">Description</Label><Textarea {...field("description")} rows={8} maxLength={20000} /></div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="submit" variant="outline" disabled={save.isPending}>Save draft</Button>
            {job?.listing_paid_at ? <Button type="button" disabled={save.isPending} onClick={() => go(true)()}>Submit for approval</Button> : <PayListing jobId={job?.id} saveDraft={() => go(false)()} />}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
