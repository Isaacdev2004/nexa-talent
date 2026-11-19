import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { openDocument, statusLabels } from "@/lib/candidate";
import { emailApplicationStatus } from "@/lib/email.functions";
import { APPLICATION_FLOW } from "@/lib/staff";

type AppStatus = Database["public"]["Enums"]["application_status"];
type Snap = { full_name?: string; email?: string; current_position?: string; city?: string; country?: string; summary?: string; skills?: string[]; years_experience?: number };
type JobSnap = { title?: string; employer?: string };

export const Route = createFileRoute("/_authenticated/staff/applications")({ component: StaffApplications });

function StaffApplications() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: apps = [] } = useQuery({
    queryKey: ["staff-applications"],
    queryFn: async () => (await supabase.from("job_applications").select("id, status, submitted_at, job_snapshot, profile_snapshot, cover_letter").order("submitted_at", { ascending: false }).limit(500)).data ?? [],
  });
  const move = useMutation({
    mutationFn: async ({ id, s }: { id: string; s: AppStatus }) => {
      const { error } = await supabase.from("job_applications").update({ status: s }).eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: async (id) => {
      qc.invalidateQueries({ queryKey: ["staff-applications"] });
      qc.invalidateQueries({ queryKey: ["staff-app-events"] });
      const mail = await emailApplicationStatus({ data: { applicationId: id } }).catch(() => null);
      if (mail?.sent) toast.success("Status updated and the candidate was emailed");
      else if (mail?.waiting) toast.success("Status updated. The candidate can see it in their account. Email sends once the sender is configured.");
      else if (mail?.failed) toast.error("Status updated, but the email could not be sent");
      else toast.success("Status updated. The candidate has a notice in their account.");
    },
    onError: () => toast.error("Couldn't update the status"),
  });
  const needle = q.trim().toLowerCase();
  const shown = apps.filter((a) => (status === "all" || a.status === status) && (!needle || JSON.stringify([a.job_snapshot, (a.profile_snapshot as Snap).full_name, (a.profile_snapshot as Snap).email]).toLowerCase().includes(needle)));
  const open = apps.find((a) => a.id === openId);

  return (
    <>
      <PageHeader title="Applications" subtitle="Review applicants and move them through the pipeline." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or job" className="max-w-xs" aria-label="Search applications" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" aria-label="Filter by status">
          <option value="all">All statuses</option>
          {[...APPLICATION_FLOW, "withdrawn"].map((s) => <option key={s} value={s}>{statusLabels[s] ?? s}</option>)}
        </select>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {shown.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No applications match.</li>}
        {shown.map((a) => { const p = a.profile_snapshot as Snap; const j = a.job_snapshot as JobSnap; return (
          <li key={a.id}><button onClick={() => setOpenId(a.id)} className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-muted/50">
            <span><span className="block font-medium">{p.full_name}</span><span className="text-sm text-muted-foreground">{j.title} · {j.employer} · {new Date(a.submitted_at).toLocaleDateString()}</span></span>
            <StatusBadge status={a.status} />
          </button></li>
        ); })}
      </ul>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && <Detail app={open} onMove={(s) => move.mutate({ id: open.id, s })} busy={move.isPending} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Detail({ app, onMove, busy }: { app: { id: string; status: AppStatus; profile_snapshot: unknown; job_snapshot: unknown; cover_letter: string | null }; onMove: (s: AppStatus) => void; busy: boolean }) {
  const p = app.profile_snapshot as Snap; const j = app.job_snapshot as JobSnap;
  const { data } = useQuery({
    queryKey: ["staff-app-events", app.id],
    queryFn: async () => {
      const [d, e] = await Promise.all([
        supabase.from("application_documents").select("id, kind, file_name, storage_path").eq("application_id", app.id),
        supabase.from("application_events").select("id, status, created_at").eq("application_id", app.id).order("created_at"),
      ]);
      return { docs: d.data ?? [], events: e.data ?? [] };
    },
  });
  const final = ["hired", "rejected", "withdrawn"].includes(app.status);
  return (
    <>
      <SheetHeader><SheetTitle>{p.full_name}</SheetTitle></SheetHeader>
      <div className="mt-4 space-y-6 text-sm">
        <div><p className="text-muted-foreground">Applied for</p><p className="font-medium">{j.title} — {j.employer}</p></div>
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-muted-foreground">Email</p><p className="break-all">{p.email}</p></div>
          <div><p className="text-muted-foreground">Location</p><p>{[p.city, p.country].filter(Boolean).join(", ") || "—"}</p></div>
          <div><p className="text-muted-foreground">Current role</p><p>{p.current_position ?? "—"}</p></div>
          <div><p className="text-muted-foreground">Experience</p><p>{p.years_experience != null ? `${p.years_experience} years` : "—"}</p></div>
        </div>
        {p.summary && <div><p className="text-muted-foreground">Summary</p><p className="whitespace-pre-line">{p.summary}</p></div>}
        {!!p.skills?.length && <div className="flex flex-wrap gap-1">{p.skills.map((s) => <span key={s} className="rounded bg-muted px-2 py-0.5 text-xs">{s}</span>)}</div>}
        {app.cover_letter && <div><p className="text-muted-foreground">Cover letter</p><p className="whitespace-pre-line">{app.cover_letter}</p></div>}
        <div><p className="mb-2 text-muted-foreground">Documents</p>
          {(data?.docs ?? []).map((d) => <Button key={d.id} variant="outline" size="sm" className="mb-2 mr-2" onClick={() => openDocument(d.storage_path).catch(() => toast.error("Couldn't open file"))}><FileText /> {d.file_name}</Button>)}
        </div>
        <div><p className="mb-2 text-muted-foreground">Move to</p>
          {final ? <p>This application is closed ({statusLabels[app.status]}).</p> : (
            <div className="flex flex-wrap gap-2">{APPLICATION_FLOW.filter((s) => s !== app.status && s !== "submitted").map((s) => <Button key={s} size="sm" variant={s === "rejected" ? "outline" : "secondary"} disabled={busy} onClick={() => onMove(s)}>{statusLabels[s]}</Button>)}</div>
          )}
        </div>
        <div><p className="mb-2 text-muted-foreground">Timeline</p>
          <ol className="space-y-1 border-l border-border pl-4">{(data?.events ?? []).map((e) => <li key={e.id}>{statusLabels[e.status]} <span className="text-muted-foreground">· {new Date(e.created_at).toLocaleString()}</span></li>)}</ol>
        </div>
      </div>
    </>
  );
}
