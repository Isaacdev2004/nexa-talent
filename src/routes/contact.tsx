import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, CheckCircle2, Clock, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ContentPage } from "@/components/site/ContentPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const TITLE = "Contact — NexaTalent";
const DESC = "Talk to our team about hiring support or anything else.";
const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  company: z.string().trim().max(160),
  message: z.string().trim().min(10, "Tell us a little more (10+ characters)").max(4000),
});

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }] }),
  component: Contact,
});

function Contact() {
  const [kind, setKind] = useState<"employer" | "general">("employer");
  const [f, setF] = useState({ name: "", email: "", company: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(f);
    if (!r.success) { setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]))); return; }
    setErrors({}); setBusy(true);
    const { error } = await supabase.from("contact_enquiries").insert({ kind, name: r.data.name, email: r.data.email.toLowerCase(), company: r.data.company || null, message: r.data.message });
    setBusy(false);
    if (error) { toast.error("We couldn't send your message. Please try again."); return; }
    setSent(true);
  };

  return (
    <ContentPage eyebrow="Contact" title="Let's talk about what you need." intro="Hiring, partnering or just have a question — send us a message and the right person on our team will reply.">
      <section className="container-site grid gap-14 py-20 lg:grid-cols-[20rem_1fr]">
        <aside className="space-y-8">
          {[[Briefcase, "Employers", "Recruiter-supported hiring, vacancies and partnerships."], [UserRound, "Candidates", "Questions about your profile or an application."], [Clock, "Straight to our team", "Every message goes directly to our recruitment team."]].map(([Icon, t, d]) => { const I = Icon as typeof Clock; return (
            <div key={t as string} className="flex gap-4"><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary"><I className="h-5 w-5" /></span><div><p className="font-semibold">{t as string}</p><p className="text-sm text-muted-foreground">{d as string}</p></div></div>
          ); })}
        </aside>
        <div className="rounded-lg border border-border bg-surface p-8 shadow-lift md:p-10">
        {sent ? (
          <div className="text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-success" /><h2 className="mt-4 text-2xl font-semibold text-primary">Thanks — we've received your message.</h2><p className="mt-2 text-muted-foreground">Our team will reply to {f.email}.</p></div>
        ) : (
          <form onSubmit={submit} className="space-y-5" noValidate>
            <div className="flex gap-2">
              {(["employer", "general"] as const).map((k) => (
                <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cn("rounded-full border px-4 py-1.5 text-sm", kind === k ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{k === "employer" ? "Employer enquiry" : "General question"}</button>
              ))}
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <Field id="name" label="Name" v={f.name} set={(v) => setF({ ...f, name: v })} err={errors["name"]} />
              <Field id="email" label="Email" type="email" v={f.email} set={(v) => setF({ ...f, email: v })} err={errors["email"]} />
            </div>
            {kind === "employer" && <Field id="company" label="Company" v={f.company} set={(v) => setF({ ...f, company: v })} err={errors["company"]} />}
            <div className="space-y-1.5"><Label htmlFor="message">Message</Label><Textarea id="message" rows={6} maxLength={4000} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />{errors["message"] && <p className="text-xs text-destructive">{errors["message"]}</p>}</div>
            <Button type="submit" size="lg" disabled={busy}>{busy ? "Sending…" : "Send message"}</Button>
          </form>
        )}
        </div>
      </section>
    </ContentPage>
  );
}

function Field({ id, label, v, set, err, type = "text" }: { id: string; label: string; v: string; set: (v: string) => void; err: string | undefined; type?: string }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={v} onChange={(e) => set(e.target.value)} />{err && <p className="text-xs text-destructive">{err}</p>}</div>;
}
