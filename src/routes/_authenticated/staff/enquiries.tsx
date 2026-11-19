import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/staff/enquiries")({ component: Enquiries });
const LABELS: Record<string, string> = { new: "New", in_progress: "In progress", closed: "Closed" };

function Enquiries() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["staff-enquiries"], queryFn: async () => (await supabase.from("contact_enquiries").select("*").order("created_at", { ascending: false }).limit(300)).data ?? [] });
  const set = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => { await supabase.from("contact_enquiries").update({ status }).eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-enquiries"] }),
  });
  return (
    <>
      <PageHeader title="Enquiries" subtitle="Messages from the contact form." />
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {data.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No enquiries yet.</li>}
        {data.map((e) => (
          <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
            <div className="max-w-2xl">
              <p className="font-medium">{e.name} <span className="font-normal text-muted-foreground">· {e.email}{e.company ? ` · ${e.company}` : ""} · {e.kind === "employer" ? "Employer" : "General"}</span></p>
              <p className="mt-1 whitespace-pre-line">{e.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
            </div>
            <select aria-label="Status" className="h-9 rounded-md border border-input bg-background px-2" value={e.status} onChange={(ev) => set.mutate({ id: e.id, status: ev.target.value })}>{Object.entries(LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </li>
        ))}
      </ul>
    </>
  );
}
