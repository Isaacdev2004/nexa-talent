import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/recruiter/")({ component: RecruiterHome });

function RecruiterHome() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const qc = useQueryClient();
  const assignments = useQuery({
    queryKey: ["recruiter-assignments", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("recruiter_assignments").select("*").eq("recruiter_user_id", uid).order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (data ?? []).map((row) => row.job_id);
      const jobs = ids.length ? await supabase.from("jobs").select("id, title, location, country").in("id", ids) : { data: [] };
      const submissions = await supabase.from("recruiter_submissions").select("*").in("assignment_id", (data ?? []).map((row) => row.id));
      return { rows: data ?? [], jobs: new Map((jobs.data ?? []).map((job) => [job.id, job])), submissions: submissions.data ?? [] };
    },
  });
  const earnings = useQuery({
    queryKey: ["recruiter-earnings", uid],
    enabled: !!uid,
    queryFn: async () => (await supabase.from("commissions").select("amount_cents, currency, status").eq("payee_user_id", uid)).data ?? [],
  });
  const respond = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase.rpc("recruiter_respond_assignment", { _id: id, _accept: accept });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recruiter-assignments"] }); toast.success("Assignment updated"); },
    onError: (error: Error) => toast.error(error.message),
  });
  const accrued = (earnings.data ?? []).filter((row) => row.status !== "reversed").reduce((sum, row) => sum + row.amount_cents, 0);
  return (
    <section className="container-site py-10">
      <PageHeader title="Assignments" subtitle="Accept authorised vacancies and introduce candidates who have agreed to be submitted." />
      <p className="mb-6 text-sm text-muted-foreground">Accrued commission: {formatMoney(accrued)}</p>
      {assignments.isError && <p className="text-destructive">Could not load assignments.</p>}
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {(assignments.data?.rows.length ?? 0) === 0 && <li className="p-6 text-sm text-muted-foreground">No assignments yet. Approved roles appear here when the recruitment team offers them.</li>}
        {assignments.data?.rows.map((row) => {
          const job = assignments.data.jobs.get(row.job_id);
          const mine = assignments.data.submissions.filter((item) => item.assignment_id === row.id);
          return (
            <li key={row.id} className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{job?.title ?? "Vacancy"}</p>
                  <p className="text-sm text-muted-foreground">{job?.location} · {job?.country} · {(row.commission_bps / 100).toFixed(0)}% of a confirmed placement</p>
                  {row.terms && <p className="mt-2 max-w-2xl text-sm">{row.terms}</p>}
                </div>
                <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold capitalize">{row.status}</span>
              </div>
              {row.status === "offered" && (
                <div className="flex gap-2">
                  <Button size="sm" disabled={respond.isPending} onClick={() => respond.mutate({ id: row.id, accept: true })}>Accept</Button>
                  <Button size="sm" variant="outline" disabled={respond.isPending} onClick={() => respond.mutate({ id: row.id, accept: false })}>Decline</Button>
                </div>
              )}
              {row.status === "accepted" && <SubmitCandidate assignmentId={row.id} />}
              {mine.length > 0 && (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {mine.map((item) => <li key={item.id}>{item.candidate_name} · {item.candidate_email} · {item.status}</li>)}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SubmitCandidate({ assignmentId }: { assignmentId: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const submit = useMutation({
    mutationFn: async () => {
      if (!consent) throw new Error("Confirm the candidate agreed to this introduction");
      const { error } = await supabase.rpc("recruiter_submit_candidate", { _assignment_id: assignmentId, _name: name, _email: email, _note: note });
      if (error) throw error;
    },
    onSuccess: () => { setName(""); setEmail(""); setNote(""); setConsent(false); qc.invalidateQueries({ queryKey: ["recruiter-assignments"] }); toast.success("Candidate submitted"); },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <form className="grid gap-3 rounded-md border border-border p-4" onSubmit={(event) => { event.preventDefault(); submit.mutate(); }}>
      <p className="text-sm font-medium">Submit a candidate</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Full name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />
        <Input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={255} />
      </div>
      <Textarea placeholder="Why they fit this role" value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={4000} />
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> The candidate agreed to be introduced for this vacancy.</label>
      <Button type="submit" size="sm" disabled={submit.isPending || !consent}>Submit candidate</Button>
    </form>
  );
}
