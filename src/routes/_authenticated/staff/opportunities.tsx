import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { emailSharedOpportunity } from "@/lib/email.functions";
import { OPPORTUNITY_LABELS } from "@/lib/opportunities";

export const Route = createFileRoute("/_authenticated/staff/opportunities")({ component: Opportunities });
const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

function Opportunities() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [f, setF] = useState({ job_id: "", email: "", description: "", note: "" });
  const { data: jobs = [] } = useQuery({ queryKey: ["staff-jobs-full"], queryFn: async () => (await supabase.from("jobs").select("id, title, employer_display_name, description, status, slug").is("deleted_at", null).in("status", ["draft", "pending_approval", "published"]).order("title")).data ?? [] });
  const { data: rows = [] } = useQuery({ queryKey: ["staff-opps"], queryFn: async () => (await supabase.from("candidate_opportunities").select("*").order("updated_at", { ascending: false }).limit(300)).data ?? [] });
  const job = (id: string) => jobs.find((j) => j.id === id);

  const share = useMutation({
    mutationFn: async () => {
      const inserted = await supabase.from("candidate_opportunities").insert({ job_id: f.job_id, candidate_email: f.email.trim().toLowerCase(), shared_description: f.description, staff_note: f.note || null, shared_by: user!.id }).select("id").single();
      if (inserted.error || !inserted.data) throw inserted.error ?? new Error("Couldn't share");
      return emailSharedOpportunity({ data: { opportunityId: inserted.data.id } });
    },
    onSuccess: (mail) => {
      setF({ job_id: "", email: "", description: "", note: "" });
      qc.invalidateQueries({ queryKey: ["staff-opps"] });
      if (mail.waiting) toast.success("Shared on their dashboard. Email sends once the sender is configured.");
      else if (mail.failed) toast.error("Shared on their dashboard, but the email could not be sent");
      else toast.success("Shared. They've been emailed as well.");
    },
    onError: (e: Error) => toast.error(e.message.includes("duplicate") ? "This role was already shared with that email" : "Couldn't share"),
  });
  const sendLink = useMutation({
    mutationFn: async (o: { id: string; job_id: string }) => {
      const j = job(o.job_id);
      if (j?.status !== "published") throw new Error("Publish the job first so the candidate can apply.");
      await navigator.clipboard.writeText(`${window.location.origin}/jobs/${j.slug}`).catch(() => {});
      const { error } = await supabase.from("candidate_opportunities").update({ status: "link_sent", updated_at: new Date().toISOString() }).eq("id", o.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff-opps"] }); toast.success("Application link copied and marked as sent"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!f.job_id || !/^\S+@\S+\.\S+$/.test(f.email.trim()) || f.description.trim().length < 10) { toast.error("Choose a job, enter a valid email and the description"); return; }
    share.mutate();
  };

  return (
    <>
      <PageHeader title="Opportunities" subtitle="Privately share a job description, collect interest, then send the application link." />
      <form onSubmit={submit} className="mb-8 grid gap-3 rounded-lg border border-border bg-surface p-5 md:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="sj">Job</Label><select id="sj" className={sel} value={f.job_id} onChange={(e) => { const j = job(e.target.value); setF({ ...f, job_id: e.target.value, description: j?.description ?? "" }); }}><option value="">Choose a job</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title} — {j.employer_display_name} ({j.status.replace("_", " ")})</option>)}</select></div>
        <div className="space-y-1.5"><Label htmlFor="se">Candidate email</Label><Input id="se" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} maxLength={255} /></div>
        <div className="space-y-1.5 md:col-span-2"><Label htmlFor="sd">Job description to share</Label><Textarea id="sd" rows={6} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={20000} /></div>
        <div className="space-y-1.5 md:col-span-2"><Label htmlFor="sn">Personal note (optional)</Label><Input id="sn" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={2000} /></div>
        <div><Button type="submit" disabled={share.isPending}>Share privately</Button></div>
      </form>
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {rows.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nothing shared yet.</li>}
        {rows.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-medium">{o.candidate_email} <span className="font-normal text-muted-foreground">· {job(o.job_id)?.title ?? "Job"}</span></p>
              <p className="text-muted-foreground">{OPPORTUNITY_LABELS[o.status]}{o.candidate_user_id ? "" : " · no account yet"}{o.candidate_response ? ` — “${o.candidate_response}”` : ""}</p>
            </div>
            {o.status === "interested" && <Button size="sm" onClick={() => sendLink.mutate(o)}><Copy /> Send application link</Button>}
          </li>
        ))}
      </ul>
    </>
  );
}
