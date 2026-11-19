import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/staff/candidates")({ component: CandidateDb });

function CandidateDb() {
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["staff-candidates"],
    queryFn: async () => {
      const { data: cands } = await supabase.from("candidates").select("user_id, current_position, industry, years_experience, skills, preferred_locations, work_arrangement, onboarding_step").is("deleted_at", null).limit(1000);
      const ids = (cands ?? []).map((c) => c.user_id);
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id, full_name, email, city, country").in("id", ids) : { data: [] };
      const byId = new Map((profs ?? []).map((p) => [p.id, p]));
      return (cands ?? []).map((c) => ({ ...c, p: byId.get(c.user_id) }));
    },
  });
  const n = q.trim().toLowerCase();
  const shown = data.filter((c) => !n || [c.p?.full_name, c.p?.email, c.current_position, c.industry, c.p?.country, c.p?.city, ...(c.skills ?? [])].join(" ").toLowerCase().includes(n));
  return (
    <>
      <PageHeader title="Candidate database" subtitle={`${data.length} registered candidates`} />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, skill, title, industry or location" className="mb-4 max-w-md" aria-label="Search candidates" />
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground"><tr><th className="p-3">Candidate</th><th className="p-3">Current role</th><th className="p-3">Location</th><th className="p-3">Skills</th><th className="p-3">Profile</th></tr></thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && shown.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No candidates match.</td></tr>}
            {shown.map((c) => (
              <tr key={c.user_id}>
                <td className="p-3"><p className="font-medium">{c.p?.full_name || "—"}</p><p className="text-muted-foreground">{c.p?.email}</p></td>
                <td className="p-3">{c.current_position ?? "—"}{c.years_experience != null && <span className="text-muted-foreground"> · {c.years_experience} yrs</span>}</td>
                <td className="p-3">{[c.p?.city, c.p?.country].filter(Boolean).join(", ") || "—"}</td>
                <td className="p-3"><div className="flex flex-wrap gap-1">{(c.skills ?? []).slice(0, 5).map((s) => <span key={s} className="rounded bg-muted px-1.5 text-xs">{s}</span>)}</div></td>
                <td className="p-3">{c.onboarding_step >= 6 ? "Complete" : `Step ${c.onboarding_step}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
