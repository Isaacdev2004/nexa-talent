import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, FileText, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DocumentUploader } from "@/components/app/DocumentUploader";
import { Stepper } from "@/components/app/Stepper";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { applicationsQuery, candidateProfileQuery, documentsQuery, type JobSnapshot } from "@/lib/candidate";
import { emailApplicationReceived } from "@/lib/email.functions";
import { formatClosingDate } from "@/lib/jobs";
import { jobQuery } from "@/lib/jobs.queries";
import { readResumeDetails } from "@/lib/resume-read.functions";
import { mergeResumeIntoForm } from "@/lib/resume-parse";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/apply/$slug")({
  head: () => ({ meta: [{ title: "Apply — NexaTalent" }, { name: "description", content: "Submit your application on NexaTalent." }, { property: "og:title", content: "Apply — NexaTalent" }, { property: "og:description", content: "Submit your application on NexaTalent." }, { name: "robots", content: "noindex" }] }),
  component: Apply,
});

const STEPS = ["Resume", "My information", "My experience", "Questions", "Review"];
const RIGHT_TO_WORK = ["Yes", "No, I would need sponsorship", "Not sure"];
const HEARD = ["NexaTalent", "A recruiter", "Company website", "Referral", "Other"];
type Entry = { title: string; org: string; period: string };
type Draft = { begun: boolean; resumeId: string | null; supporting: string[]; coverLetter: string; notice: string; rightToWork: string; heard: string; accurate: boolean; consent: boolean };
const emptyDraft: Draft = { begun: false, resumeId: null, supporting: [], coverLetter: "", notice: "", rightToWork: "", heard: "", accurate: false, consent: false };

function asEntries(value: unknown): Entry[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 15).map((row) => {
    const item = (row ?? {}) as Partial<Entry>;
    return { title: String(item.title ?? ""), org: String(item.org ?? ""), period: String(item.period ?? "") };
  });
}

function Apply() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const job = useQuery(jobQuery(slug));
  const prof = useQuery(candidateProfileQuery(uid));
  const docs = useQuery(documentsQuery(uid));
  const apps = useQuery(applicationsQuery(uid));
  const [step, setStep] = useState(1);
  const [d, setD] = useState<Draft>(emptyDraft);
  const [info, setInfo] = useState({ name: "", email: "", phone: "", country: "", city: "", position: "", industry: "", years: "", summary: "" });
  const [history, setHistory] = useState<Entry[]>([]);
  const [education, setEducation] = useState<Entry[]>([]);
  const [skills, setSkills] = useState("");
  const [ready, setReady] = useState(false);
  const [reading, setReading] = useState(false);
  const [parsedResumeId, setParsedResumeId] = useState<string | null>(null);
  const [filledFromResume, setFilledFromResume] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [flags, setFlags] = useState<Record<string, string>>({});
  const draftKey = `nexa-apply-draft:${uid}:${slug}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) setD({ ...emptyDraft, ...JSON.parse(raw) });
    } catch { /* ignore a damaged draft */ }
  }, [draftKey]);
  useEffect(() => { if (!submittedId) localStorage.setItem(draftKey, JSON.stringify(d)); }, [d, draftKey, submittedId]);
  useEffect(() => {
    if (!prof.data || ready) return;
    const p = prof.data.profile;
    const c = prof.data.candidate;
    setInfo({
      name: p?.full_name ?? "", email: p?.email ?? "", phone: p?.phone ?? "", country: p?.country ?? "", city: p?.city ?? "",
      position: c?.current_position ?? "", industry: c?.industry ?? "", years: c?.years_experience?.toString() ?? "", summary: c?.summary ?? "",
    });
    setHistory(asEntries(c?.employment_history));
    setEducation(asEntries(c?.education));
    setSkills((c?.skills ?? []).join(", "));
    setReady(true);
  }, [prof.data, ready]);

  if (job.isLoading || prof.isLoading || apps.isLoading) return <section className="container-site py-12"><Skeleton className="h-96" /></section>;
  if (!job.data) return <Notice title="This opportunity isn't open for applications" />;
  if (!prof.data?.candidate) return <Notice title="Applications are made from a candidate account" body="Your account type can't apply for roles. Create a separate candidate account to apply." />;
  const existing = apps.data?.find((a) => (a.job_snapshot as JobSnapshot)?.slug === slug);
  if (existing && !submittedId) return <Notice title="You've already applied for this role" link={{ to: existing.id, label: "View your application" }} />;

  const j = job.data;
  const resumes = (docs.data ?? []).filter((x) => x.kind === "resume");
  const others = (docs.data ?? []).filter((x) => x.kind !== "resume");
  const kept = (rows: Entry[]) => rows.filter((row) => row.title || row.org || row.period).slice(0, 15);

  const issuesFor = (n: number): Record<string, string> => {
    const out: Record<string, string> = {};
    if (n === 1 && !resumes.some((r) => r.id === d.resumeId)) out["resume"] = "Attach a resume before you continue. PDF or Word, up to 10 MB.";
    if (n === 2) {
      if (info.name.trim().length < 2) out["name"] = "Enter your full name.";
      if (info.country.trim().length < 2) out["country"] = "Enter your country.";
    }
    if (n === 3 && !/^\d+$/.test(info.years.trim())) out["years"] = "Enter your years of experience as a whole number.";
    else if (n === 3 && Number(info.years) > 70) out["years"] = "Enter a number from 0 to 70.";
    if (n === 4) {
      if (!d.notice.trim()) out["notice"] = "Enter your notice period.";
      if (!RIGHT_TO_WORK.includes(d.rightToWork)) out["right"] = `Choose your right to work in ${j.country}.`;
      if (d.coverLetter.length > 8000) out["cover"] = "The cover letter must be 8,000 characters or fewer.";
    }
    if (n === 5) {
      if (!d.accurate) out["accurate"] = "Confirm that your information and documents are accurate.";
      if (!d.consent) out["consent"] = "Confirm that the recruitment team may review this application.";
    }
    return out;
  };

  const saveProfile = async () => {
    const [profileResult, candidateResult] = await Promise.all([
      supabase.from("profiles").update({ full_name: info.name.trim(), phone: info.phone.trim() || null, country: info.country.trim() || null, city: info.city.trim() || null }).eq("id", uid),
      supabase.from("candidates").update({
        current_position: info.position.trim() || null,
        industry: info.industry.trim() || null,
        years_experience: info.years.trim() ? Number(info.years) : null,
        summary: info.summary.trim() || null,
        skills: skills.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 30),
        employment_history: kept(history),
        education: kept(education),
      }).eq("user_id", uid),
    ]);
    if (profileResult.error || candidateResult.error) throw new Error("Couldn't save your details. Please try again.");
    await qc.invalidateQueries({ queryKey: ["candidate-profile", uid] });
  };

  const next = async () => {
    const found = issuesFor(step);
    setFlags(found);
    if (Object.keys(found).length > 0) return;
    if (step === 1 && d.resumeId && d.resumeId !== parsedResumeId) {
      setReading(true);
      try {
        const details = await readResumeDetails({ data: { documentId: d.resumeId } });
        const merged = mergeResumeIntoForm({
          name: info.name, phone: info.phone, city: info.city, country: info.country,
          position: info.position, years: info.years, summary: info.summary, skills, history, education,
        }, details);
        setInfo({ ...info, name: merged.name, phone: merged.phone, city: merged.city, country: merged.country, position: merged.position, years: merged.years, summary: merged.summary });
        setSkills(merged.skills);
        setHistory(merged.history);
        setEducation(merged.education);
        setParsedResumeId(d.resumeId);
        setFilledFromResume(details.experience.length > 0 || details.education.length > 0);
        const sections = [details.experience.length ? "work experience" : "", details.education.length ? "education" : ""].filter(Boolean);
        if (sections.length) toast.success(`Filled ${sections.join(" and ")} from your resume. Check them and change anything that isn't right.`);
        else toast("We couldn't find work experience or education in that file. Add them on the next steps.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "We couldn't read that resume. You can still fill in the details.");
      } finally {
        setReading(false);
      }
    }
    if (step === 2 || step === 3) {
      try { await saveProfile(); } catch (err) { toast.error(err instanceof Error ? err.message : "Couldn't save your details."); return; }
    }
    setFlags({});
    setStep((current) => current + 1);
  };

  const submit = async () => {
    for (const n of [1, 2, 3, 4, 5]) {
      const found = issuesFor(n);
      if (Object.keys(found).length > 0) { setStep(n); setFlags(found); return; }
    }
    setSubmitting(true);
    try { await saveProfile(); } catch (err) { setSubmitting(false); toast.error(err instanceof Error ? err.message : "Couldn't save your details."); return; }
    const { data, error } = await supabase.rpc("submit_application", {
      _job_slug: slug, _resume_id: d.resumeId!, _cover_letter: d.coverLetter, _supporting_ids: d.supporting,
      _answers: { notice_period: d.notice.slice(0, 100), right_to_work: d.rightToWork, how_heard: d.heard.slice(0, 80) },
      _confirmations: { accurate: d.accurate, consent: d.consent, version: "2026-11" },
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    localStorage.removeItem(draftKey);
    setSubmittedId(data as string);
    qc.invalidateQueries({ queryKey: ["applications", uid] });
    const mail = await emailApplicationReceived({ data: { applicationId: data as string } }).catch(() => null);
    if (mail?.failed) toast.error("Application submitted, but the thank-you email could not be sent");
  };

  if (submittedId) return (
    <section className="container-site max-w-2xl py-20 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-success animate-in zoom-in-50 duration-500" />
      <h1 className="mt-6 text-3xl font-bold text-primary">Application submitted</h1>
      <p className="mt-3 text-muted-foreground">Thank you. Your application for <strong>{j.title}</strong> at {j.employer} has been received. Our recruitment team will review it and you can follow its progress at any time.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Button asChild><Link to="/applications/$id" params={{ id: submittedId }}>Track this application</Link></Button>
        <Button asChild variant="outline"><Link to="/jobs">Browse more roles</Link></Button>
      </div>
    </section>
  );

  const docName = (id: string | null) => (docs.data ?? []).find((x) => x.id === id)?.file_name ?? "—";
  const begin = (useProfile: boolean) => {
    const latest = resumes[0]?.id ?? null;
    setD((current) => ({ ...current, begun: true, resumeId: useProfile ? current.resumeId ?? latest : current.resumeId }));
    setStep(1);
  };

  return (
    <section className="container-site grid gap-10 py-10 lg:grid-cols-[minmax(0,42rem)_18rem] lg:justify-center">
      <div>
        <Link to="/jobs/$slug" params={{ slug }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to job</Link>
        <p className="mt-6 text-sm text-muted-foreground">{j.employer} · {j.location}, {j.country}</p>
        <h1 className="mt-1 text-3xl font-bold text-primary">{d.begun ? "Apply for this job" : j.title}</h1>
        {d.begun && <p className="mt-1 font-medium">{j.title}</p>}
        {d.begun && <p className="mt-2 text-xs text-muted-foreground">* indicates a required field. Your progress is saved on this device.</p>}

        {!d.begun ? (
          <div className="mt-8 rounded-lg border border-border bg-surface p-6 md:p-8">
            <h2 className="text-xl font-semibold text-primary">Start your application</h2>
            <p className="mt-2 text-sm text-muted-foreground">Use the details already on your NexaTalent profile, or fill the application in yourself. You can change anything before you submit.</p>
            <div className="mt-6 grid gap-3">
              <Button className="h-11" onClick={() => begin(true)}>Continue with my profile</Button>
              <Button variant="outline" className="h-11" onClick={() => begin(false)}>Enter my details</Button>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">Applying is free. Your application is never conditional on purchasing a service.</p>
          </div>
        ) : (
          <>
            <div className="mt-8"><Stepper steps={STEPS} current={step} onStep={(n) => { setFlags({}); setStep(n); }} /></div>
            <div className="mt-8 space-y-5 rounded-lg border border-border bg-surface p-6 md:p-8">
              <h2 className="text-xl font-semibold text-primary">{STEPS[step - 1]}</h2>
              {Object.keys(flags).length > 0 && <div role="alert" className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">This step is incomplete. Fix the items in red before you continue.</div>}

              {step === 1 && (<>
                <p className="text-sm text-muted-foreground">Attach the resume you want considered for this role. We'll read it and fill in your work experience, education, and any contact details that are still blank. You can correct everything afterwards.</p>
                {flags["resume"] && <Flag>{flags["resume"]}</Flag>}
                <div className={cn("space-y-2 rounded-md border border-dashed p-4", flags["resume"] ? "border-destructive" : "border-border")}>
                  {resumes.length === 0 && <p className="text-sm text-muted-foreground">No resume on your profile yet.</p>}
                  {resumes.map((r) => (
                    <label key={r.id} className={cn("flex cursor-pointer items-center gap-3 rounded-md border bg-background p-3 text-sm", d.resumeId === r.id ? "border-primary" : "border-border")}>
                      <input type="radio" name="resume" checked={d.resumeId === r.id} onChange={() => setD({ ...d, resumeId: r.id })} className="accent-[var(--primary)]" />
                      <FileText className="h-4 w-4 text-primary" />{r.file_name}
                    </label>
                  ))}
                  <DocumentUploader userId={uid} kind="resume" label="Upload resume" onUploaded={(id) => setD((s) => ({ ...s, resumeId: id }))} />
                  <p className="text-xs text-muted-foreground">PDF or Word, up to 10 MB.</p>
                </div>
                <div className="border-t border-border pt-5">
                  <h3 className="text-sm font-semibold">Other documents <span className="font-normal text-muted-foreground">(optional)</span></h3>
                  <div className="mt-2 space-y-2">
                    {others.map((o) => (
                      <label key={o.id} className="flex items-center gap-3 text-sm">
                        <Checkbox checked={d.supporting.includes(o.id)} onCheckedChange={(v) => setD({ ...d, supporting: v ? [...d.supporting, o.id] : d.supporting.filter((x) => x !== o.id) })} />{o.file_name}
                      </label>
                    ))}
                  </div>
                  <div className="mt-3"><DocumentUploader userId={uid} kind="supporting" label="Upload another document" onUploaded={(id) => setD((s) => ({ ...s, supporting: [...s.supporting, id] }))} /></div>
                </div>
              </>)}

              {step === 2 && (<>
                <Field id="name" label="Full name" required value={info.name} error={flags["name"]} onChange={(name) => setInfo({ ...info, name })} autoComplete="name" />
                <Field id="email" label="Email" value={info.email} onChange={() => undefined} disabled />
                <Field id="phone" label="Phone" value={info.phone} onChange={(phone) => setInfo({ ...info, phone })} autoComplete="tel" />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="country" label="Country" required value={info.country} error={flags["country"]} onChange={(country) => setInfo({ ...info, country })} autoComplete="country-name" />
                  <Field id="city" label="City" value={info.city} onChange={(city) => setInfo({ ...info, city })} autoComplete="address-level2" />
                </div>
              </>)}

              {step === 3 && (<>
                {filledFromResume && <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">These details were read from your resume. Change anything that isn't right before you continue.</p>}
                <Field id="position" label="Current position" value={info.position} onChange={(position) => setInfo({ ...info, position })} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="industry" label="Industry" value={info.industry} onChange={(industry) => setInfo({ ...info, industry })} />
                  <Field id="years" label="Years of experience" required value={info.years} error={flags["years"]} onChange={(years) => setInfo({ ...info, years })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="summary">Professional summary</Label>
                  <Textarea id="summary" rows={5} maxLength={4000} value={info.summary} onChange={(e) => setInfo({ ...info, summary: e.target.value })} />
                </div>
                <Field id="skills" label="Skills" value={skills} onChange={setSkills} placeholder="Separate skills with commas" />
                <Entries label="Work experience" items={history} onChange={setHistory} labels={["Job title", "Employer", "Dates"]} />
                <Entries label="Education" items={education} onChange={setEducation} labels={["Qualification", "Institution", "Year"]} />
              </>)}

              {step === 4 && (<>
                <div className="space-y-1.5">
                  <Label htmlFor="cl">Cover letter <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Textarea id="cl" rows={8} maxLength={8000} value={d.coverLetter} onChange={(e) => setD({ ...d, coverLetter: e.target.value })} placeholder="Tell the team why this role fits you." />
                  <p className="text-right text-xs text-muted-foreground">{d.coverLetter.length}/8000</p>
                  {flags["cover"] && <Flag>{flags["cover"]}</Flag>}
                </div>
                <Field id="notice" label="Notice period" required value={d.notice} error={flags["notice"]} onChange={(notice) => setD({ ...d, notice })} placeholder="e.g. 1 month" />
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Right to work in {j.country} <span className="text-destructive">*</span></legend>
                  <div className="flex flex-wrap gap-2">{RIGHT_TO_WORK.map((option) => (
                    <button key={option} type="button" aria-pressed={d.rightToWork === option} onClick={() => setD({ ...d, rightToWork: option })} className={cn("rounded-full border px-3 py-1.5 text-sm", d.rightToWork === option ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{option}</button>
                  ))}</div>
                  {flags["right"] && <Flag>{flags["right"]}</Flag>}
                </fieldset>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">How did you hear about this role?</legend>
                  <div className="flex flex-wrap gap-2">{HEARD.map((option) => (
                    <button key={option} type="button" aria-pressed={d.heard === option} onClick={() => setD({ ...d, heard: option })} className={cn("rounded-full border px-3 py-1.5 text-sm", d.heard === option ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{option}</button>
                  ))}</div>
                </fieldset>
              </>)}

              {step === 5 && (<>
                <ReviewRow label="Resume" value={docName(d.resumeId)} onEdit={() => setStep(1)} />
                <ReviewRow label="Name" value={info.name} onEdit={() => setStep(2)} />
                <ReviewRow label="Location" value={[info.city, info.country].filter(Boolean).join(", ") || "—"} onEdit={() => setStep(2)} />
                <ReviewRow label="Experience" value={[info.position, info.years ? `${info.years} years` : ""].filter(Boolean).join(" · ") || "—"} onEdit={() => setStep(3)} />
                <ReviewRow label="Work history" value={kept(history).map((row) => row.title || row.org).filter(Boolean).join(", ") || "None added"} onEdit={() => setStep(3)} />
                <ReviewRow label="Education" value={kept(education).map((row) => row.title || row.org).filter(Boolean).join(", ") || "None added"} onEdit={() => setStep(3)} />
                <ReviewRow label="Notice period" value={d.notice || "—"} onEdit={() => setStep(4)} />
                <ReviewRow label="Right to work" value={d.rightToWork || "—"} onEdit={() => setStep(4)} />
                <ReviewRow label="Cover letter" value={d.coverLetter ? `${d.coverLetter.slice(0, 140)}${d.coverLetter.length > 140 ? "…" : ""}` : "None"} onEdit={() => setStep(4)} />
                <label className={cn("flex gap-3 text-sm", flags["accurate"] && "text-destructive")}><Checkbox checked={d.accurate} onCheckedChange={(v) => setD({ ...d, accurate: !!v })} />The information and documents I've provided are accurate and my own.</label>
                {flags["accurate"] && <Flag>{flags["accurate"]}</Flag>}
                <label className={cn("flex gap-3 text-sm", flags["consent"] && "text-destructive")}><Checkbox checked={d.consent} onCheckedChange={(v) => setD({ ...d, consent: !!v })} />I agree that NexaTalent's recruitment team, and the employer where permitted, may review my application for this role.</label>
                {flags["consent"] && <Flag>{flags["consent"]}</Flag>}
                <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">Applying is free. Your application is never conditional on purchasing any service.</p>
              </>)}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <Button variant="outline" onClick={() => step === 1 ? setD({ ...d, begun: false }) : setStep((current) => current - 1)}>Back</Button>
              {step < 5
                ? <Button onClick={() => void next()} disabled={reading}>{reading ? "Reading your resume…" : "Save and continue"}</Button>
                : <Button onClick={() => void submit()} disabled={submitting} className="bg-accent text-accent-foreground hover:bg-accent/90">{submitting ? "Submitting…" : "Submit application"}</Button>}
            </div>
          </>
        )}
      </div>
      <aside className="h-fit rounded-lg border border-border bg-surface p-5 text-sm lg:mt-16">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">This role</p>
        <p className="mt-2 font-semibold">{j.title}</p>
        <p className="text-muted-foreground">{j.employer}</p>
        <p className="mt-3 text-muted-foreground">{j.employmentType} · {j.arrangement}</p>
        <p className="mt-1 text-muted-foreground">{j.location}, {j.country}</p>
        <p className="mt-3 text-muted-foreground">Closes {formatClosingDate(j.closingDate)}</p>
        {j.isDemo && <p className="mt-3 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">Demo listing</p>}
      </aside>
    </section>
  );
}

function Field({ id, label, value, onChange, error, required, disabled, autoComplete, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; error?: string | undefined; required?: boolean; disabled?: boolean; autoComplete?: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input id={id} value={value} disabled={disabled} placeholder={placeholder} autoComplete={autoComplete} aria-invalid={!!error} onChange={(e) => onChange(e.target.value)} />
      {error && <Flag>{error}</Flag>}
    </div>
  );
}
function Entries({ label, items, onChange, labels }: { label: string; items: Entry[]; onChange: (rows: Entry[]) => void; labels: [string, string, string] }) {
  const update = (index: number, key: keyof Entry, value: string) => onChange(items.map((row, i) => (i === index ? { ...row, [key]: value.slice(0, 150) } : row)));
  return (
    <div className="space-y-3 border-t border-border pt-5">
      <h3 className="text-sm font-semibold">{label}</h3>
      {items.map((row, index) => (
        <div key={index} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_8rem_auto]">
          <Input aria-label={labels[0]} placeholder={labels[0]} value={row.title} onChange={(e) => update(index, "title", e.target.value)} />
          <Input aria-label={labels[1]} placeholder={labels[1]} value={row.org} onChange={(e) => update(index, "org", e.target.value)} />
          <Input aria-label={labels[2]} placeholder={labels[2]} value={row.period} onChange={(e) => update(index, "period", e.target.value)} />
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${label.toLowerCase()}`} onClick={() => onChange(items.filter((_, i) => i !== index))}><Trash2 /></Button>
        </div>
      ))}
      {items.length < 15 && <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { title: "", org: "", period: "" }])}><Plus /> Add {label.toLowerCase()}</Button>}
    </div>
  );
}
function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-3 text-sm">
      <div><p className="text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>
      <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={onEdit}>Edit</button>
    </div>
  );
}
function Flag({ children }: { children: string }) {
  return <p role="alert" className="text-sm text-destructive">{children}</p>;
}
function Notice({ title, body, link }: { title: string; body?: string; link?: { to: string; label: string } }) {
  return (
    <section className="container-site max-w-2xl py-20">
      <h1 className="text-3xl font-bold text-primary">{title}</h1>
      {body && <p className="mt-3 text-muted-foreground">{body}</p>}
      <div className="mt-8 flex gap-3">
        {link && <Button asChild><Link to="/applications/$id" params={{ id: link.to }}>{link.label}</Link></Button>}
        <Button asChild variant="outline"><Link to="/jobs">Browse roles</Link></Button>
      </div>
    </section>
  );
}
