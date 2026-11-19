import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/specialist")({ head: () => ({ meta: [{ title: "Specialist profile — NexaTalent" }, { name: "description", content: "Submit your professional specialist profile for administrator review." }, { property: "og:title", content: "Specialist profile — NexaTalent" }, { property: "og:description", content: "Your professional profile and membership review." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }), component: Specialist });
type Profile = Database["public"]["Tables"]["specialist_profiles"]["Row"];
const FIELDS = [["professional_name", "Professional name", true], ["country", "Country", false], ["biography", "Professional biography", true], ["experience", "Work experience", false], ["expertise", "Areas of expertise", true], ["portfolio_url", "Portfolio link", false], ["certifications", "Certifications", false], ["languages", "Languages", false], ["services", "Service categories", true], ["preferred_currency", "Preferred currency", false]] as const;
function Specialist() {
  const { user } = useAuth();
  return user ? <SpecialistWorkspace uid={user.id} /> : null;
}
function SpecialistWorkspace({ uid }: { uid: string }) {
  const account = useQuery({ queryKey: ["specialist-account", uid], queryFn: async () => { const [roles, profile] = await Promise.all([supabase.from("user_roles").select("role").eq("user_id", uid), supabase.from("specialist_profiles").select("*").eq("user_id", uid).maybeSingle()]); if (roles.error) throw roles.error; if (profile.error) throw profile.error; return { allowed: roles.data.some((r) => r.role === "specialist"), profile: profile.data }; } });
  return <section className="container-site max-w-4xl py-12"><PageHeader title="Specialist profile" subtitle="Your expertise. Your professional identity." actions={<Button asChild variant="outline"><Link to="/dashboard">Dashboard</Link></Button>} />
    {account.isLoading ? <p>Loading profile…</p> : account.isError ? <p role="alert" className="text-destructive">Could not load your profile.</p> : !account.data?.allowed ? <p className="text-muted-foreground">This workspace is for registered document specialists.</p> : <ProfileForm key={account.data.profile?.updated_at ?? "new"} uid={uid} profile={account.data.profile} />}
  </section>;
}
function ProfileForm({ uid, profile }: { uid: string; profile: Profile | null }) {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(FIELDS.map(([key]) => [key, profile?.[key] ?? (key === "preferred_currency" ? "USD" : "")])));
  const save = useMutation({ mutationFn: async () => { const { error } = await supabase.rpc("submit_specialist_profile", { _profile: values }); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["specialist-account", uid] }); toast.success("Profile submitted for administrator review"); }, onError: (e: Error) => toast.error(e.message) });
  return <><Button asChild variant="outline" className="mb-5"><Link to="/specialist-work">Referrals & service orders</Link></Button><div className="mb-8 border-y border-border py-5"><div className="flex items-center gap-2 font-semibold text-primary"><BadgeCheck className="h-5 w-5" />{profile ? { approved: "Approved profile", pending: "Awaiting administrator review", rejected: "Changes requested" }[profile.status] : "Apply for membership"}</div>{profile?.review_note && <p className="mt-2 text-sm text-muted-foreground">{profile.review_note}</p>}</div>
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid gap-6 md:grid-cols-2">{FIELDS.map(([key, label, required]) => <label key={key} className={`space-y-2 text-sm font-medium ${["biography", "experience", "services"].includes(key) ? "md:col-span-2" : ""}`}><span>{label}{required ? " *" : ""}</span>{["biography", "experience", "services"].includes(key) ? <Textarea rows={4} required={required} maxLength={5000} value={values[key]} onChange={(e) => setValues({ ...values, [key]: e.target.value })} /> : <Input type={key === "portfolio_url" ? "url" : "text"} required={required} maxLength={1000} value={values[key]} onChange={(e) => setValues({ ...values, [key]: e.target.value })} />}</label>)}
      <div className="md:col-span-2"><p className="mb-4 text-sm text-muted-foreground">Only list genuine experience and credentials. Submitting changes sends your profile for a new review.</p><Button disabled={save.isPending}><Save />{save.isPending ? "Submitting…" : "Submit for approval"}</Button></div>
    </form></>;
}