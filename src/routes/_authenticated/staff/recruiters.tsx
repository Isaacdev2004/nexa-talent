import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/staff/recruiters")({ component: StaffRecruiters });

function StaffRecruiters() {
  const qc = useQueryClient();
  const recruiters = useQuery({ queryKey: ["staff-recruiters"], queryFn: async () => (await supabase.rpc("list_recruiters")).data ?? [] });
  const jobs = useQuery({ queryKey: ["staff-assignable-jobs"], queryFn: async () => (await supabase.from("jobs").select("id, title, status").in("status", ["pending_approval", "published"]).is("deleted_at", null).order("title")).data ?? [] });
  const submissions = useQuery({
    queryKey: ["staff-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("recruiter_submissions").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });
  const [jobId, setJobId] = useState("");
  const [recruiterId, setRecruiterId] = useState("");
  const [rate, setRate] = useState("15");
  const [terms, setTerms] = useState("");
  const offer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("staff_offer_assignment", { _job_id: jobId, _recruiter_id: recruiterId, _rate_bps: Math.round(Number(rate) * 100), _terms: terms });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Assignment offered"); qc.invalidateQueries({ queryKey: ["staff-submissions"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const decide = useMutation({
    mutationFn: async ({ id, status, cents }: { id: string; status: string; cents: number }) => {
      const { error } = await supabase.rpc("staff_set_submission_status", { _id: id, _status: status, _placement_cents: cents, _currency: "usd" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Submission updated"); qc.invalidateQueries({ queryKey: ["staff-submissions"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <>
      <PageHeader title="Recruiter assignments" subtitle="Offer an authorised vacancy, then confirm or reject the candidates they introduce." />
      <form className="grid gap-3 rounded-lg border border-border bg-surface p-5" onSubmit={(event) => { event.preventDefault(); offer.mutate(); }}>
        <div className="grid gap-3 md:grid-cols-2">
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={jobId} onChange={(event) => setJobId(event.target.value)} required>
            <option value="">Vacancy</option>
            {jobs.data?.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={recruiterId} onChange={(event) => setRecruiterId(event.target.value)} required>
            <option value="">Active recruiter</option>
            {recruiters.data?.filter((person) => person.account_status === "active").map((person) => <option key={person.user_id} value={person.user_id}>{person.full_name} · {person.email}</option>)}
          </select>
          <Input type="number" min="0" max="50" step="0.5" value={rate} onChange={(event) => setRate(event.target.value)} aria-label="Commission percent" />
          <Textarea value={terms} onChange={(event) => setTerms(event.target.value)} placeholder="Assignment terms" rows={2} maxLength={4000} />
        </div>
        <Button type="submit" disabled={offer.isPending}>Offer assignment</Button>
      </form>
      <ul className="mt-8 divide-y divide-border rounded-lg border border-border bg-surface">
        {(submissions.data ?? []).length === 0 && <li className="p-6 text-sm text-muted-foreground">No candidate submissions yet.</li>}
        {(submissions.data ?? []).map((row) => <SubmissionRow key={row.id} row={row} pending={decide.isPending} onDecide={(status, cents) => decide.mutate({ id: row.id, status, cents })} />)}
      </ul>
    </>
  );
}

function SubmissionRow({ row, pending, onDecide }: { row: { id: string; candidate_name: string; candidate_email: string; note: string; status: string }; pending: boolean; onDecide: (status: string, cents: number) => void }) {
  const [value, setValue] = useState("");
  return (
    <li className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{row.candidate_name}</p>
          <p className="text-sm text-muted-foreground">{row.candidate_email} · {row.status}</p>
          {row.note && <p className="mt-2 text-sm">{row.note}</p>}
        </div>
      </div>
      {row.status !== "placed" && row.status !== "rejected" && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={pending} onClick={() => onDecide("reviewing", 0)}>Mark reviewing</Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => onDecide("rejected", 0)}>Reject</Button>
          <Input className="w-36" type="number" min="1" placeholder="Placement USD" value={value} onChange={(event) => setValue(event.target.value)} />
          <Button size="sm" disabled={pending} onClick={() => onDecide("placed", Math.round(Number(value) * 100))}>Confirm placement</Button>
        </div>
      )}
    </li>
  );
}
