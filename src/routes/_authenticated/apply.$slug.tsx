import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, FileText, Pencil } from "lucide-react";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/apply/$slug")({
  head: () => ({ meta: [{ title: "Apply — NexaTalent" }, { name: "description", content: "Submit your application on NexaTalent." }, { property: "og:title", content: "Apply — NexaTalent" }, { property: "og:description", content: "Submit your application on NexaTalent." }, { name: "robots", content: "noindex" }] }),
  component: Apply,
});

const STEPS = ["Profile", "Resume", "Details", "Confirm", "Review"];
type Draft = { resumeId: string | null; supporting: string[]; coverLetter: string; notice: string; rightToWork: string; accurate: boolean; consent: boolean };
const emptyDraft: Draft = { resumeId: null, supporting: [], coverLetter: "", notice: "", rightToWork: "", accurate: false, consent: false };

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
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [flags, setFlags] = useState<Record<string, string>>({});
  const draftKey = `nexa-apply-draft:${uid}:${slug}`;

  useEffect(() => {
    try { const raw = localStorage.getItem(draftKey); if (raw) setD({ ...emptyDraft, ...JSON.parse(raw) }); } catch { /* ignore bad draft */ }
  }, [draftKey]);
  useEffect(() => { if (!submittedId) localStorage.setItem(draftKey, JSON.stringify(d)); }, [d, draftKey, submittedId]);

  if (job.isLoading || prof.isLoading || apps.isLoading) return <section className="container-site py-12"><Skeleton className="h-96" /></section>;
  if (!job.data) return <Notice title="This opportunity isn't open for applications" />;
  if (!prof.data?.candidate) return <Notice title="Applications are made from a candidate account" body="Your account type can't apply for roles. Create a separate candidate account to apply." />;
  const existing = apps.data?.find((a) => (a.job_snapshot as JobSnapshot)?.slug === slug);
  if (existing && !submittedId) return <Notice title="You've already applied for this role" link={{ to: existing.id, label: "View your application" }} />;

  const j = job.data;
  const p = prof.data.profile, c = prof.data.candidate;
  const resumes = (docs.data ?? []).filter((x) => x.kind === "resume");
  const others = (docs.data ?? []).filter((x) => x.kind !== "resume");
  const RIGHT_TO_WORK = ["Yes", "No, I would need sponsorship", "Not sure"];
  const issuesFor = (n: number): Record<string, string> => {
    const out: Record<string, string> = {};
    if (n === 1) {
      if (!p?.full_name?.trim()) out.name = "Add your full name before continuing.";
      if (!p?.country?.trim()) out.country = "Add your country before continuing.";
      if (!p?.email?.trim()) out.email = "Your account needs an email address before you can apply.";
    }
    if (n === 2 && !resumes.some((r) => r.id === d.resumeId)) out.resume = "Choose or upload a resume. It must be a PDF or Word file, up to 10 MB.";
    if (n === 3) {
      if (!d.notice.trim()) out.notice = "Enter your notice period.";
      if (!RIGHT_TO_WORK.includes(d.rightToWork)) out.right = `Choose your right to work in ${j.country}.`;
      if (d.coverLetter.length > 8000) out.cover = "The cover letter must be 8,000 characters or fewer.";
    }
    if (n === 4) {
      if (!d.accurate) out.accurate = "Confirm that your information and documents are accurate.";
      if (!d.consent) out.consent = "Confirm that the recruitment team may review this application.";
    }
    return out;
  };
  const next = () => {
    const found = issuesFor(step);
    setFlags(found);
    if (Object.keys(found).length > 0) return;
    setFlags({});
    setStep((s) => s + 1);
  };

  const submit = async () => {
    for (const n of [1, 2, 3, 4]) {
      const found = issuesFor(n);
      if (Object.keys(found).length > 0) { setStep(n); setFlags(found); return; }
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_application", {
      _job_slug: slug, _resume_id: d.resumeId!, _cover_letter: d.coverLetter, _supporting_ids: d.supporting,
      _answers: { notice_period: d.notice.slice(0, 100), right_to_work: d.rightToWork },
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

  return (
    <section className="container-site grid gap-10 py-12 lg:grid-cols-[1fr_18rem]">
      <div>
        <p className="eyebrow text-muted-foreground">Application</p>
        <h1 className="mt-2 text-3xl font-bold text-primary">{j.title}</h1>
        <p className="mt-1 text-muted-foreground">{j.employer} · {j.location}, {j.country}</p>
        <div className="mt-8"><Stepper steps={STEPS} current={step} /></div>

        <div className="mt-8 space-y-5 rounded-lg border border-border bg-surface p-6 md:p-8">
          {Object.keys(flags).length > 0 && <div role="alert" className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">This step is incomplete. Fix the items in red before you continue.</div>}
          {step === 1 && (<>
            <h2 className="font-semibold">Your profile</h2>
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              <Row k="Name" v={p?.full_name} /><Row k="Email" v={p?.email} /><Row k="Location" v={[p?.city, p?.country].filter(Boolean).join(", ")} />
              <Row k="Current position" v={c?.current_position} /><Row k="Experience" v={c?.years_experience != null ? `${c.years_experience} years` : null} /><Row k="Skills" v={c?.skills?.join(", ")} />
            </dl>
            <p className="text-sm text-muted-foreground">A copy of your profile is saved with the application. Later changes to your profile won't alter it.</p>
            {(flags.name || flags.country || flags.email) && <div className="space-y-1">{flags.name && <Flag>{flags.name}</Flag>}{flags.country && <Flag>{flags.country}</Flag>}{flags.email && <Flag>{flags.email}</Flag>}</div>}
            <Button asChild variant="outline" size="sm"><Link to="/onboarding"><Pencil /> Edit profile</Link></Button>
          </>)}
          {step === 2 && (<>
            <h2 className="font-semibold">Choose your resume</h2>
            {flags.resume && <Flag>{flags.resume}</Flag>}
            <div className={cn("space-y-2 rounded-md", flags.resume && "border border-destructive p-3")}>
              {resumes.length === 0 && <p className="text-sm text-muted-foreground">You haven't uploaded a resume yet.</p>}
              {resumes.map((r) => (
                <label key={r.id} className={cn("flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm", d.resumeId === r.id ? "border-primary bg-secondary" : "border-border")}>
                  <input type="radio" name="resume" checked={d.resumeId === r.id} onChange={() => setD({ ...d, resumeId: r.id })} className="accent-[var(--primary)]" />
                  <FileText className="h-4 w-4 text-primary" />{r.file_name}
                </label>
              ))}
            </div>
            <DocumentUploader userId={uid} kind="resume" label="Upload a new resume" onUploaded={(id) => setD((s) => ({ ...s, resumeId: id }))} />
            <div className="border-t border-border pt-5">
              <h3 className="text-sm font-semibold">Supporting documents (optional)</h3>
              <div className="mt-2 space-y-2">
                {others.map((o) => (
                  <label key={o.id} className="flex items-center gap-3 text-sm">
                    <Checkbox checked={d.supporting.includes(o.id)} onCheckedChange={(v) => setD({ ...d, supporting: v ? [...d.supporting, o.id] : d.supporting.filter((x) => x !== o.id) })} />{o.file_name}
                  </label>
                ))}
              </div>
              <div className="mt-3"><DocumentUploader userId={uid} kind="supporting" label="Upload supporting document" onUploaded={(id) => setD((s) => ({ ...s, supporting: [...s.supporting, id] }))} /></div>
            </div>
          </>)}
          {step === 3 && (<>
            <div className="space-y-1.5"><Label htmlFor="cl">Cover letter (optional)</Label>
              <Textarea id="cl" rows={8} maxLength={8000} value={d.coverLetter} onChange={(e) => setD({ ...d, coverLetter: e.target.value })} placeholder="Tell the team why this role fits you." />
              <p className="text-right text-xs text-muted-foreground">{d.coverLetter.length}/8000</p></div>
            {flags.cover && <Flag>{flags.cover}</Flag>}
            <div className="space-y-1.5"><Label htmlFor="np">Notice period</Label><Input id="np" maxLength={100} value={d.notice} aria-invalid={!!flags.notice} onChange={(e) => setD({ ...d, notice: e.target.value })} placeholder="e.g. 1 month" className="max-w-xs" />{flags.notice && <Flag>{flags.notice}</Flag>}</div>
            <fieldset><legend className="mb-2 text-sm font-medium">Right to work in {j.country}</legend>
              <div className="flex flex-wrap gap-2">{["Yes", "No, I would need sponsorship", "Not sure"].map((o) => (
                <button key={o} type="button" aria-pressed={d.rightToWork === o} onClick={() => setD({ ...d, rightToWork: o })} className={cn("rounded-full border px-3 py-1.5 text-sm", d.rightToWork === o ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{o}</button>
              ))}</div>{flags.right && <Flag>{flags.right}</Flag>}</fieldset>
          </>)}
          {step === 4 && (<>
            <h2 className="font-semibold">Confirmations</h2>
            <label className={cn("flex gap-3 text-sm", flags.accurate && "text-destructive")}><Checkbox checked={d.accurate} onCheckedChange={(v) => setD({ ...d, accurate: !!v })} />The information and documents I've provided are accurate and my own.</label>
            {flags.accurate && <Flag>{flags.accurate}</Flag>}
            <label className={cn("flex gap-3 text-sm", flags.consent && "text-destructive")}><Checkbox checked={d.consent} onCheckedChange={(v) => setD({ ...d, consent: !!v })} />I agree that NexaTalent's recruitment team, and the employer where permitted, may review my application for this role.</label>
            {flags.consent && <Flag>{flags.consent}</Flag>}
            <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">Applying is free. Your application is never conditional on purchasing any service.</p>
          </>)}
          {step === 5 && (<>
            <h2 className="font-semibold">Review your application</h2>
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              <Row k="Applicant" v={p?.full_name} /><Row k="Resume" v={docName(d.resumeId)} />
              <Row k="Supporting documents" v={d.supporting.map(docName).join(", ") || "None"} /><Row k="Notice period" v={d.notice || "—"} />
              <Row k="Right to work" v={d.rightToWork || "—"} /><Row k="Cover letter" v={d.coverLetter ? `${d.coverLetter.slice(0, 120)}${d.coverLetter.length > 120 ? "…" : ""}` : "None"} />
            </dl>
          </>)}
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="ghost" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>Back</Button>
          {step < 5 ? <Button onClick={next}>Continue</Button>
            : <Button onClick={submit} disabled={submitting} className="bg-accent text-accent-foreground hover:bg-accent/90">{submitting ? "Submitting…" : "Submit application"}</Button>}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Your progress is saved on this device.</p>
      </div>
      <aside className="h-fit rounded-lg border border-border bg-surface p-5 text-sm">
        <p className="eyebrow text-muted-foreground">Role</p>
        <p className="mt-2 font-semibold">{j.title}</p>
        <p className="text-muted-foreground">{j.employmentType} · {j.arrangement}</p>
        <p className="mt-3 text-muted-foreground">Closes {formatClosingDate(j.closingDate)}</p>
        {j.isDemo && <p className="mt-3 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">Demo listing</p>}
      </aside>
    </section>
  );
}

function Flag({ children }: { children: string }) {
  return <p role="alert" className="text-sm text-destructive">{children}</p>;
}
function Row({ k, v }: { k: string; v: string | null | undefined }) {
  return <div><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v || <span className="text-warning">Missing</span>}</dd></div>;
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
