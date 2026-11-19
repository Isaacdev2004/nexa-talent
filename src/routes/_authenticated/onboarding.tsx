import type * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { DocumentUploader } from "@/components/app/DocumentUploader";
import { Stepper } from "@/components/app/Stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { candidateProfileQuery, documentsQuery } from "@/lib/candidate";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Set up your profile — NexaTalent" }, { name: "description", content: "Complete your NexaTalent candidate profile." }, { property: "og:title", content: "Set up your profile — NexaTalent" }, { property: "og:description", content: "Complete your NexaTalent candidate profile." }, { name: "robots", content: "noindex" }] }),
  component: Onboarding,
});

const STEPS = ["Personal", "Background", "Skills", "Preferences", "Documents"];
type Entry = { title: string; org: string; period: string };
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 30);
const EMPLOYMENT = ["Full-time", "Part-time", "Contract", "Temporary", "Internship"];

const schemas = {
  1: z.object({ full_name: z.string().trim().min(2, "Enter your full name").max(120), phone: z.string().trim().max(40), country: z.string().trim().min(2, "Enter your country").max(80), city: z.string().trim().max(80) }),
  2: z.object({
    current_position: z.string().trim().max(150),
    industry: z.string().trim().max(100),
    years_experience: z.string().trim().min(1, "Enter your years of experience").refine((v) => /^\d+$/.test(v) && Number(v) <= 70, "Enter a whole number from 0 to 70"),
    summary: z.string().trim().max(4000),
  }),
};

function Onboarding() {
  const { user } = useAuth();
  const uid = user!.id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(candidateProfileQuery(uid));
  const { data: docs = [] } = useQuery(documentsQuery(uid));
  const [step, setStep] = useState(1);
  const [f, setF] = useState<Record<string, string>>({});
  const [education, setEducation] = useState<Entry[]>([]);
  const [history, setHistory] = useState<Entry[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const p = data.profile, c = data.candidate;
    setF({
      full_name: p?.full_name ?? "", phone: p?.phone ?? "", country: p?.country ?? "", city: p?.city ?? "",
      current_position: c?.current_position ?? "", industry: c?.industry ?? "", years_experience: c?.years_experience?.toString() ?? "", summary: c?.summary ?? "",
      skills: (c?.skills ?? []).join(", "), certifications: (c?.certifications ?? []).join(", "),
      preferred_titles: (c?.preferred_titles ?? []).join(", "), preferred_locations: (c?.preferred_locations ?? []).join(", "),
      work_arrangement: c?.work_arrangement ?? "Any", expected_salary: c?.expected_salary ?? "", profile_visibility: c?.profile_visibility ?? "recruiters",
    });
    setEducation((c?.education as Entry[] | null) ?? []);
    setHistory((c?.employment_history as Entry[] | null) ?? []);
    setTypes(c?.employment_types ?? []);
    setStep(Math.min(Math.max(c?.onboarding_step ?? 1, 1), 5));
  }, [data]);

  if (isLoading) return <section className="container-site py-12"><Skeleton className="h-96" /></section>;
  if (!data?.candidate) return (
    <section className="container-site py-16"><h1 className="text-2xl font-bold text-primary">Profile setup is for candidate accounts</h1><Button asChild className="mt-6"><Link to="/dashboard">Back to dashboard</Link></Button></section>
  );

  const set = (k: string) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async (finish = false) => {
    setErrors({});
    const sch = schemas[step as 1 | 2];
    if (sch) {
      const r = sch.safeParse(f);
      if (!r.success) { setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    }
    if (finish && !docs.some((doc) => doc.kind === "resume")) {
      setErrors({ resume: "Upload a resume before you finish. It must be a PDF or Word file, up to 10 MB." });
      return;
    }
    setSaving(true);
    const nextStep = Math.max(data.candidate?.onboarding_step ?? 1, finish ? 6 : step + 1);
    const cand = {
      current_position: f["current_position"] || null, industry: f["industry"] || null,
      years_experience: f["years_experience"] ? Number(f["years_experience"]) : null, summary: f["summary"] || null,
      skills: list(f["skills"] ?? ""), certifications: list(f["certifications"] ?? ""),
      education: education.filter((e) => e.title || e.org), employment_history: history.filter((e) => e.title || e.org),
      preferred_titles: list(f["preferred_titles"] ?? ""), preferred_locations: list(f["preferred_locations"] ?? ""),
      employment_types: types, work_arrangement: f["work_arrangement"] || "Any", expected_salary: f["expected_salary"] || null,
      profile_visibility: f["profile_visibility"] || "recruiters", onboarding_step: nextStep,
    };
    const [a, b] = await Promise.all([
      supabase.from("profiles").update({ full_name: f["full_name"] ?? "", phone: f["phone"] || null, country: f["country"] || null, city: f["city"] || null }).eq("id", uid),
      supabase.from("candidates").update(cand).eq("user_id", uid),
    ]);
    setSaving(false);
    if (a.error || b.error) { toast.error("Couldn't save. Please try again."); return; }
    await qc.invalidateQueries({ queryKey: ["candidate-profile", uid] });
    await qc.invalidateQueries({ queryKey: ["account", uid] });
    if (finish) { toast.success("Your profile is complete."); navigate({ to: "/dashboard" }); }
    else { toast.success("Progress saved"); setStep((s) => Math.min(s + 1, 5)); }
  };

  return (
    <section className="container-site max-w-3xl py-12">
      <p className="eyebrow text-muted-foreground">Candidate profile</p>
      <h1 className="mt-2 text-3xl font-bold text-primary">Set up your profile</h1>
      <p className="mt-2 text-muted-foreground">Your progress is saved at every step, so you can come back any time.</p>
      <div className="mt-8"><Stepper steps={STEPS} current={step} /></div>

      <div className="mt-8 space-y-5 rounded-lg border border-border bg-surface p-6 md:p-8">
        {step === 1 && (<>
          <F label="Full name" error={errors["full_name"]}><Input value={f["full_name"] ?? ""} onChange={set("full_name")} autoComplete="name" /></F>
          <F label="Email"><Input value={data.profile?.email ?? ""} disabled /></F>
          <div className="grid gap-5 md:grid-cols-3">
            <F label="Phone" error={errors["phone"]}><Input value={f["phone"] ?? ""} onChange={set("phone")} autoComplete="tel" /></F>
            <F label="Country" error={errors["country"]}><Input value={f["country"] ?? ""} onChange={set("country")} autoComplete="country-name" /></F>
            <F label="City" error={errors["city"]}><Input value={f["city"] ?? ""} onChange={set("city")} /></F>
          </div>
        </>)}
        {step === 2 && (<>
          <div className="grid gap-5 md:grid-cols-2">
            <F label="Current position"><Input value={f["current_position"] ?? ""} onChange={set("current_position")} /></F>
            <F label="Industry"><Input value={f["industry"] ?? ""} onChange={set("industry")} /></F>
          </div>
          <F label="Years of experience" error={errors["years_experience"]}><Input type="number" min={0} max={70} value={f["years_experience"] ?? ""} onChange={set("years_experience")} className="max-w-32" /></F>
          <F label="Professional summary"><Textarea rows={5} maxLength={4000} value={f["summary"] ?? ""} onChange={set("summary")} /></F>
        </>)}
        {step === 3 && (<>
          <F label="Skills" hint="Separate with commas"><Input value={f["skills"] ?? ""} onChange={set("skills")} placeholder="Financial modelling, SQL, Stakeholder management" /></F>
          <F label="Certifications" hint="Separate with commas"><Input value={f["certifications"] ?? ""} onChange={set("certifications")} /></F>
          <Entries label="Education" items={education} onChange={setEducation} labels={["Qualification", "Institution", "Year"]} />
          <Entries label="Employment history" items={history} onChange={setHistory} labels={["Job title", "Employer", "Dates"]} />
        </>)}
        {step === 4 && (<>
          <F label="Preferred job titles" hint="Separate with commas"><Input value={f["preferred_titles"] ?? ""} onChange={set("preferred_titles")} /></F>
          <F label="Preferred locations" hint="Separate with commas"><Input value={f["preferred_locations"] ?? ""} onChange={set("preferred_locations")} /></F>
          <fieldset><legend className="mb-2 text-sm font-medium">Employment types</legend>
            <div className="flex flex-wrap gap-2">{EMPLOYMENT.map((t) => (
              <Chip key={t} active={types.includes(t)} onClick={() => setTypes((s) => s.includes(t) ? s.filter((x) => x !== t) : [...s, t])}>{t}</Chip>
            ))}</div></fieldset>
          <fieldset><legend className="mb-2 text-sm font-medium">Work arrangement</legend>
            <div className="flex flex-wrap gap-2">{["Any", "On-site", "Hybrid", "Remote"].map((t) => (
              <Chip key={t} active={f["work_arrangement"] === t} onClick={() => setF((s) => ({ ...s, work_arrangement: t }))}>{t}</Chip>
            ))}</div></fieldset>
          <F label="Expected salary (optional)"><Input value={f["expected_salary"] ?? ""} onChange={set("expected_salary")} className="max-w-xs" /></F>
        </>)}
        {step === 5 && (<>
          <div>
            <h2 className="font-semibold">Resume and documents</h2>
            {errors["resume"] && <p role="alert" className="mt-2 text-sm text-destructive">{errors["resume"]}</p>}
            <ul className="mt-3 divide-y divide-border rounded-md border border-border">
              {docs.length === 0 && <li className="p-3 text-sm text-muted-foreground">No documents yet.</li>}
              {docs.map((d) => <li key={d.id} className="flex justify-between p-3 text-sm"><span>{d.file_name}</span><span className="text-muted-foreground">{d.kind.replace("_", " ")}</span></li>)}
            </ul>
            <div className="mt-4 flex flex-wrap gap-6">
              <DocumentUploader userId={uid} kind="resume" label="Upload resume" />
              <DocumentUploader userId={uid} kind="supporting" label="Upload other document" />
            </div>
          </div>
          <fieldset><legend className="mb-2 text-sm font-medium">Who can see your profile?</legend>
            <div className="flex flex-wrap gap-2">
              <Chip active={f["profile_visibility"] === "recruiters"} onClick={() => setF((s) => ({ ...s, profile_visibility: "recruiters" }))}>Our recruitment team</Chip>
              <Chip active={f["profile_visibility"] === "private"} onClick={() => setF((s) => ({ ...s, profile_visibility: "private" }))}>Only me, and roles I apply for</Chip>
            </div></fieldset>
        </>)}
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>Back</Button>
        {step < 5
          ? <Button onClick={() => save()} disabled={saving}>{saving ? "Saving…" : "Save and continue"}</Button>
          : <Button onClick={() => save(true)} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">{saving ? "Saving…" : "Finish profile"}</Button>}
      </div>
    </section>
  );
}

function F({ label, hint, error, children }: { label: string; hint?: string; error?: string | undefined; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}{hint && <span className="ml-2 font-normal text-muted-foreground">{hint}</span>}</span>{children}{error && <span className="block text-xs text-destructive">{error}</span>}</label>;
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors", active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40")}>{children}</button>;
}
function Entries({ label, items, onChange, labels }: { label: string; items: Entry[]; onChange: (e: Entry[]) => void; labels: [string, string, string] }) {
  const upd = (i: number, k: keyof Entry, v: string) => onChange(items.map((e, j) => (j === i ? { ...e, [k]: v.slice(0, 150) } : e)));
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="space-y-2">
        {items.map((e, i) => (
          <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_8rem_auto]">
            <Input placeholder={labels[0]} value={e.title} onChange={(x) => upd(i, "title", x.target.value)} />
            <Input placeholder={labels[1]} value={e.org} onChange={(x) => upd(i, "org", x.target.value)} />
            <Input placeholder={labels[2]} value={e.period} onChange={(x) => upd(i, "period", x.target.value)} />
            <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 /></Button>
          </div>
        ))}
      </div>
      {items.length < 15 && <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => onChange([...items, { title: "", org: "", period: "" }])}><Plus /> Add</Button>}
    </div>
  );
}
