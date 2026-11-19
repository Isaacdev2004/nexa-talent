import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/staff/outreach")({ component: Outreach });

const CHANNELS = ["email", "phone", "linkedin", "referral", "event", "other"];
const OUTCOMES: Record<string, string> = { contacted: "Contacted", no_response: "No response", interested: "Interested", not_interested: "Not interested", follow_up: "Follow up" };
const blank = { candidate_name: "", candidate_email: "", channel: "email", job_id: "", outcome: "contacted", notes: "", follow_up_on: "" };
const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

function Outreach() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [f, setF] = useState(blank);
  const { data: jobs = [] } = useQuery({ queryKey: ["staff-job-options"], queryFn: async () => (await supabase.from("jobs").select("id, title, employer_display_name").is("deleted_at", null).in("status", ["draft", "pending_approval", "published"]).order("title")).data ?? [] });
  const { data: rows = [] } = useQuery({ queryKey: ["staff-outreach"], queryFn: async () => (await supabase.from("outreach_records").select("*").order("created_at", { ascending: false }).limit(300)).data ?? [] });
  const jobTitle = (id: string | null) => jobs.find((j) => j.id === id)?.title;
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("outreach_records").insert({ ...f, candidate_email: f.candidate_email.trim().toLowerCase() || null, job_id: f.job_id || null, notes: f.notes || null, follow_up_on: f.follow_up_on || null, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { setF(blank); qc.invalidateQueries({ queryKey: ["staff-outreach"] }); toast.success("Outreach logged"); },
    onError: () => toast.error("Couldn't save — check the name and fields"),
  });
  const update = useMutation({
    mutationFn: async ({ id, outcome }: { id: string; outcome: string }) => { const { error } = await supabase.from("outreach_records").update({ outcome, updated_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-outreach"] }),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); if (f.candidate_name.trim().length < 2) { toast.error("Enter the candidate's name"); return; } add.mutate(); };
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <PageHeader title="Outreach records" subtitle="Log every proactive contact with a candidate." />
      <form onSubmit={submit} className="mb-8 grid gap-3 rounded-lg border border-border bg-surface p-5 md:grid-cols-3">
        <div className="space-y-1.5"><Label htmlFor="on">Candidate name</Label><Input id="on" value={f.candidate_name} onChange={set("candidate_name")} maxLength={120} /></div>
        <div className="space-y-1.5"><Label htmlFor="oe">Email (optional)</Label><Input id="oe" type="email" value={f.candidate_email} onChange={set("candidate_email")} maxLength={255} /></div>
        <div className="space-y-1.5"><Label htmlFor="oc">Channel</Label><select id="oc" className={sel} value={f.channel} onChange={set("channel")}>{CHANNELS.map((c) => <option key={c} value={c}>{c[0]!.toUpperCase() + c.slice(1)}</option>)}</select></div>
        <div className="space-y-1.5"><Label htmlFor="oj">Related job</Label><select id="oj" className={sel} value={f.job_id} onChange={set("job_id")}><option value="">None</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title} — {j.employer_display_name}</option>)}</select></div>
        <div className="space-y-1.5"><Label htmlFor="oo">Outcome</Label><select id="oo" className={sel} value={f.outcome} onChange={set("outcome")}>{Object.entries(OUTCOMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="space-y-1.5"><Label htmlFor="of">Follow up on</Label><Input id="of" type="date" value={f.follow_up_on} onChange={set("follow_up_on")} /></div>
        <div className="space-y-1.5 md:col-span-3"><Label htmlFor="ont">Notes</Label><Textarea id="ont" rows={2} value={f.notes} onChange={set("notes")} maxLength={4000} /></div>
        <div className="md:col-span-3"><Button type="submit" disabled={add.isPending}>Log outreach</Button></div>
      </form>
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {rows.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No outreach logged yet.</li>}
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-medium">{r.candidate_name} <span className="font-normal text-muted-foreground">· {r.channel}{r.candidate_email ? ` · ${r.candidate_email}` : ""}</span></p>
              {r.job_id && <p className="text-muted-foreground">Re: {jobTitle(r.job_id)}</p>}
              {r.notes && <p className="mt-1">{r.notes}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}{r.follow_up_on ? ` · follow up ${r.follow_up_on}` : ""}</p>
            </div>
            <select aria-label="Outcome" className="h-9 rounded-md border border-input bg-background px-2" value={r.outcome} onChange={(e) => update.mutate({ id: r.id, outcome: e.target.value })}>{Object.entries(OUTCOMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </li>
        ))}
      </ul>
    </>
  );
}
