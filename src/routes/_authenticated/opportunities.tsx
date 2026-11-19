import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { OPPORTUNITY_LABELS } from "@/lib/opportunities";

export const Route = createFileRoute("/_authenticated/opportunities")({
  head: () => ({ meta: [{ title: "Shared opportunities — NexaTalent" }, { name: "description", content: "Roles our recruitment team shared with you." }, { property: "og:title", content: "Shared opportunities — NexaTalent" }, { property: "og:description", content: "Roles our recruitment team shared with you." }, { name: "robots", content: "noindex" }] }),
  component: MyOpportunities,
});

function MyOpportunities() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-opportunities"],
    queryFn: async () => (await supabase.from("candidate_opportunities").select("id, job_id, shared_description, staff_note, status, candidate_response, created_at").order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <section className="container-site max-w-3xl py-12">
      <p className="eyebrow text-muted-foreground">Shared with you</p>
      <h1 className="mt-2 text-3xl font-bold text-primary">Opportunities</h1>
      <p className="mt-2 text-muted-foreground">Roles our recruitment team thinks could suit you. Let us know if you're interested — there's no obligation.</p>
      <div className="mt-8 space-y-6">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {!isLoading && data.length === 0 && <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">Nothing has been shared with you yet. <Link to="/jobs" className="text-primary underline">Browse open roles</Link>.</p>}
        {data.map((o) => <OpportunityCard key={o.id} o={o} />)}
      </div>
    </section>
  );
}

function OpportunityCard({ o }: { o: { id: string; shared_description: string; staff_note: string | null; status: string; candidate_response: string | null } }) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const [expanded, setExpanded] = useState(false);
  const respond = useMutation({
    mutationFn: async (interested: boolean) => { const { error } = await supabase.rpc("respond_to_opportunity", { _id: o.id, _interested: interested, _message: msg }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-opportunities"] }); toast.success("Thanks — our team has been told"); },
    onError: () => toast.error("Couldn't send your response"),
  });
  const open = ["shared", "interested", "declined"].includes(o.status);
  return (
    <article className="rounded-lg border border-border bg-surface p-6">
      <p className="text-xs font-medium text-muted-foreground">{OPPORTUNITY_LABELS[o.status]}</p>
      {o.staff_note && <p className="mt-2 italic">“{o.staff_note}”</p>}
      <div className={expanded ? "mt-4 whitespace-pre-line text-sm" : "mt-4 line-clamp-6 whitespace-pre-line text-sm"}>{o.shared_description}</div>
      <button className="mt-2 text-sm text-primary" onClick={() => setExpanded(!expanded)}>{expanded ? "Show less" : "Read full description"}</button>
      {o.status === "link_sent" && <p className="mt-4 text-sm">Our team has sent you a link to apply. Check your messages from the recruiter.</p>}
      {open && (
        <div className="mt-5 space-y-3 border-t border-border pt-5">
          <Textarea rows={2} placeholder="Add a message (optional)" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={2000} aria-label="Message to recruiter" />
          <div className="flex gap-2">
            <Button disabled={respond.isPending} onClick={() => respond.mutate(true)}>{o.status === "interested" ? "Still interested" : "I'm interested"}</Button>
            <Button variant="outline" disabled={respond.isPending} onClick={() => respond.mutate(false)}>Not for me</Button>
          </div>
        </div>
      )}
    </article>
  );
}
