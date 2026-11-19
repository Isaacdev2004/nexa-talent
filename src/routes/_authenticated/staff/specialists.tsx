import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { canReviewSpecialist } from "@/lib/assessment";

export const Route = createFileRoute("/_authenticated/staff/specialists")({ head: () => ({ meta: [{ title: "Specialist approvals — NexaTalent" }, { name: "description", content: "Review professional profiles and approve specialist membership." }, { property: "og:title", content: "Specialist approvals — NexaTalent" }, { property: "og:description", content: "Administrator-reviewed specialist membership." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }), component: SpecialistReviews });
function SpecialistReviews() {
  const { user } = useAuth();
  const roles = useQuery({ queryKey: ["reviewer-roles", user?.id], enabled: Boolean(user), queryFn: async () => { if (!user) return []; const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id); if (error) throw error; return data.map((r) => r.role); } });
  const profiles = useQuery({ queryKey: ["staff-specialists"], queryFn: async () => { const { data, error } = await supabase.from("specialist_profiles").select("*").order("updated_at", { ascending: false }).limit(100); if (error) throw error; return data; } });
  return <><PageHeader title="Specialist membership" subtitle="Review genuine expertise before approving membership." />
    {(profiles.isError || roles.isError) && <p role="alert" className="text-destructive">Could not load specialist applications.</p>}
    {profiles.isLoading && <p>Loading applications…</p>}
    {profiles.data?.length === 0 && <p className="border-t border-border py-10 text-muted-foreground">No specialist profiles submitted yet.</p>}
    {profiles.data?.map((p) => <ProfileReview key={p.user_id + p.updated_at} profile={p} allowed={canReviewSpecialist(roles.data ?? [])} />)}
  </>;
}
function ProfileReview({ profile, allowed }: { profile: Database["public"]["Tables"]["specialist_profiles"]["Row"]; allowed: boolean }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const review = useMutation({ mutationFn: async (approve: boolean) => { const { error } = await supabase.rpc("review_specialist", { _user_id: profile.user_id, _approve: approve, _note: note }); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff-specialists"] }); toast.success("Review recorded"); }, onError: (e: Error) => toast.error(e.message) });
  return <article className="border-t border-border py-8"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-semibold text-primary">{profile.professional_name}</h2><p className="mt-1 text-sm text-muted-foreground">{profile.country} · {profile.languages} · {profile.preferred_currency}</p></div><span className="text-sm font-semibold capitalize">{profile.status}</span></div><p className="my-4 whitespace-pre-wrap text-sm">{profile.biography}</p><dl className="grid gap-5 text-sm md:grid-cols-2">{[["Experience", profile.experience], ["Expertise", profile.expertise], ["Services", profile.services], ["Certifications", profile.certifications], ["Portfolio", profile.portfolio_url]].map(([title, value]) => <div key={title}><dt className="font-semibold">{title}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{value || "Not provided"}</dd></div>)}</dl>
    {profile.review_note && <p className="mt-4 text-sm text-muted-foreground">Review: {profile.review_note}</p>}
    {profile.status === "pending" && (allowed ? <div className="mt-6 max-w-xl"><label className="block text-sm font-medium">Review note<Textarea className="mt-2" value={note} onChange={(e) => setNote(e.target.value)} /></label><div className="mt-3 flex gap-2"><Button disabled={review.isPending} onClick={() => review.mutate(true)}><Check />Approve</Button><Button variant="outline" disabled={review.isPending || !note.trim()} onClick={() => review.mutate(false)}><X />Request changes</Button></div></div> : <p className="mt-5 text-sm text-muted-foreground">Only administrators can approve specialist membership.</p>)}
  </article>;
}