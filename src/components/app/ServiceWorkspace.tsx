import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Check,
  Download,
  FileText,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { openDocument, validateDocument } from "@/lib/candidate";
import { createServiceCheckout } from "@/lib/payments.functions";
import {
  canAcceptQuote,
  money,
  orderActions,
  quoteTotal,
  statusLabel,
  type Agreement,
  type QuoteItem,
} from "@/lib/services";

type Referral = Database["public"]["Tables"]["specialist_referrals"]["Row"];
type Quote = Database["public"]["Tables"]["quotations"]["Row"];
type Order = Database["public"]["Tables"]["service_orders"]["Row"];
type Specialist = Database["public"]["Functions"]["approved_specialists"]["Returns"][number];
type Mode = "candidate" | "specialist" | "staff";
const ACTION_LABELS: Record<string, string> = {
  in_progress: "Start / resume work",
  awaiting_candidate_information: "Request information",
  completed: "Accept final delivery",
  revision_requested: "Request revision",
  cancelled: "Cancel order",
  disputed: "Raise dispute",
};
const queryKey = ["service-workspace"];

export function ServiceWorkspace({ mode }: { mode: Mode }) {
  const [tab, setTab] = useState<"referrals" | "orders" | "directory">("referrals");
  const { user } = useAuth();
  const query = useQuery({
    queryKey: [...queryKey, user?.id, mode],
    enabled: Boolean(user),
    queryFn: async () => {
      const [r, q, o, s] = await Promise.all([
        supabase.from("specialist_referrals").select("*").order("created_at", { ascending: false }),
        supabase.from("quotations").select("*").order("created_at", { ascending: false }),
        supabase.from("service_orders").select("*").order("updated_at", { ascending: false }),
        supabase.rpc("approved_specialists"),
      ]);
      for (const result of [r, q, o, s]) if (result.error) throw result.error;
      return {
        referrals: r.data ?? [],
        quotes: q.data ?? [],
        orders: o.data ?? [],
        specialists: s.data ?? [],
      };
    },
  });
  return (
    <>
      <PageHeader
        title={
          mode === "candidate"
            ? "My specialist services"
            : mode === "specialist"
              ? "Specialist work"
              : "Referrals & service orders"
        }
        subtitle={
          mode === "candidate"
            ? "Your decisions. Clear agreements. Private delivery."
            : "Professional services, from referral to final delivery."
        }
        actions={
          <Button asChild variant="outline">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        }
      />
      {mode === "candidate" && (
        <p className="mb-7 flex items-start gap-3 border-y border-border py-4 text-sm text-muted-foreground">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          Specialist services are optional. Declining never affects job applications, and services
          do not guarantee employment.
        </p>
      )}
      <nav
        aria-label="Service views"
        className="mb-8 flex flex-wrap gap-1 border-b border-border pb-3"
      >
        {(["referrals", "orders", "directory"] as const)
          .filter((t) => mode !== "specialist" || t !== "directory")
          .map((t) => (
            <Button key={t} variant={tab === t ? "default" : "ghost"} onClick={() => setTab(t)}>
              {t === "directory"
                ? "Approved specialists"
                : t === "referrals"
                  ? "Referrals & quotations"
                  : "Service orders"}
            </Button>
          ))}
      </nav>
      {query.isPending && <p>Loading services…</p>}
      {query.isError && (
        <div role="alert">
          <p className="text-destructive">Could not load services.</p>
          <Button variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {query.data && (
        <>
          {tab === "directory" && <SpecialistDirectory specialists={query.data.specialists} />}
          {tab === "referrals" && (
            <>
              {mode === "staff" && <ReferralForm specialists={query.data.specialists} />}
              {query.data.referrals.length === 0 && (
                <Empty
                  text={
                    mode === "specialist"
                      ? "No consented referrals yet."
                      : "No specialist referrals yet."
                  }
                />
              )}
              {query.data.referrals.map((r) => (
                <ReferralPanel
                  key={r.id}
                  referral={r}
                  mode={mode}
                  quotes={query.data.quotes.filter((q) => q.referral_id === r.id)}
                  specialist={query.data.specialists.find(
                    (s) => s.user_id === r.specialist_user_id,
                  )}
                />
              ))}
            </>
          )}
          {tab === "orders" && (
            <>
              {query.data.orders.length === 0 && <Empty text="No service orders yet." />}
              {query.data.orders.map((o) => (
                <OrderPanel key={o.id} order={o} mode={mode} />
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="py-12 text-muted-foreground">{text}</p>;
}
function SpecialistDirectory({ specialists }: { specialists: Specialist[] }) {
  const [search, setSearch] = useState("");
  const filtered = specialists.filter((s) =>
    `${s.professional_name} ${s.services} ${s.expertise} ${s.country}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <Input
        aria-label="Search approved specialists"
        placeholder="Name, expertise, service or country"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-6 max-w-lg"
      />
      {!filtered.length && <Empty text="No matching approved specialists." />}
      {filtered.map((s) => (
        <article key={s.user_id} className="border-t border-border py-7">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-primary">{s.professional_name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {s.country} · {s.languages}
              </p>
            </div>
            <span className="flex items-center gap-2 text-sm text-primary">
              <ShieldCheck className="h-4 w-4" />
              Membership approved
            </span>
          </div>
          <p className="my-4 whitespace-pre-wrap">{s.biography}</p>
          <dl className="grid gap-5 text-sm md:grid-cols-2">
            {[
              ["Expertise", s.expertise],
              ["Services", s.services],
              ["Experience", s.experience],
              ["Certifications", s.certifications],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="font-semibold">{label}</dt>
                <dd className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {value || "Not provided"}
                </dd>
              </div>
            ))}
          </dl>
          {/^https?:\/\//i.test(s.portfolio_url) && (
            <a
              className="mt-4 inline-block text-sm text-primary underline"
              href={s.portfolio_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View portfolio
            </a>
          )}
        </article>
      ))}
    </>
  );
}
function ReferralForm({ specialists }: { specialists: Specialist[] }) {
  const qc = useQueryClient();
  const [assessment, setAssessment] = useState("");
  const [specialist, setSpecialist] = useState("");
  const [service, setService] = useState("");
  const [requirements, setRequirements] = useState("");
  const reports = useQuery({
    queryKey: ["referrable-assessments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("id,candidate_user_id,resume_name,job_snapshot")
        .eq("status", "published");
      if (error) throw error;
      return data;
    },
  });
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("create_specialist_referral", {
        _assessment_id: assessment,
        _specialist_id: specialist,
        _service: service,
        _requirements: requirements,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      setAssessment("");
      setSpecialist("");
      setService("");
      setRequirements("");
      toast.success("Referral sent for candidate consent");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <form
      className="mb-10 grid gap-5 border-b border-border pb-8 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h2 className="text-xl font-semibold md:col-span-2">Create specialist referral</h2>
      <label className="space-y-2 text-sm font-medium">
        Published assessment
        <select
          required
          aria-label="Published assessment"
          className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3"
          value={assessment}
          onChange={(e) => setAssessment(e.target.value)}
        >
          <option value="">Choose candidate assessment</option>
          {reports.data?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.resume_name} · {a.candidate_user_id.slice(0, 8)}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium">
        Approved specialist
        <select
          required
          aria-label="Approved specialist"
          className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3"
          value={specialist}
          onChange={(e) => setSpecialist(e.target.value)}
        >
          <option value="">Choose specialist</option>
          {specialists.map((s) => (
            <option key={s.user_id} value={s.user_id}>
              {s.professional_name} · {s.expertise}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm font-medium">
        Service name
        <Input
          required
          maxLength={200}
          value={service}
          onChange={(e) => setService(e.target.value)}
        />
      </label>
      <label className="space-y-2 text-sm font-medium md:col-span-2">
        Service requirements
        <Textarea
          required
          maxLength={5000}
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
        />
      </label>
      <div className="md:col-span-2">
        {reports.isError && (
          <p role="alert" className="mb-3 text-destructive">
            Could not load assessments.
          </p>
        )}
        <Button disabled={save.isPending || reports.isPending}>
          <Send />
          Send referral
        </Button>
      </div>
    </form>
  );
}
function ReferralPanel({
  referral: r,
  mode,
  quotes,
  specialist,
}: {
  referral: Referral;
  mode: Mode;
  quotes: Quote[];
  specialist: Specialist | undefined;
}) {
  const qc = useQueryClient();
  const [consent, setConsent] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const respond = useMutation({
    mutationFn: async (accept: boolean) => {
      const { error } = await supabase.rpc("respond_specialist_referral", {
        _id: r.id,
        _consent: accept,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Referral decision recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const open = async () => {
    const { data, error } = await supabase.rpc("referral_resume", { _id: r.id });
    if (error || !data?.[0]) throw new Error("Resume unavailable");
    await openDocument(data[0].storage_path);
  };
  return (
    <article className="border-t border-border py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            Referral · {new Date(r.created_at).toLocaleDateString()}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-primary">{r.service_name}</h2>
          <p className="mt-1 text-sm">
            {mode === "specialist" ? r.candidate_name : r.specialist_name}
            {mode === "staff" ? ` · ${r.candidate_name}` : ""}
          </p>
        </div>
        <span className="rounded-md bg-secondary px-3 py-1 text-xs font-semibold capitalize">
          {statusLabel(r.status)}
        </span>
      </div>
      <p className="my-5 whitespace-pre-wrap text-sm text-muted-foreground">{r.requirements}</p>
      {mode === "candidate" && specialist && (
        <details className="mb-5 text-sm">
          <summary className="cursor-pointer font-medium text-primary">Specialist profile</summary>
          <div className="mt-3 space-y-2">
            <p>{specialist.biography}</p>
            <p>Expertise: {specialist.expertise}</p>
            <p>Experience: {specialist.experience}</p>
            <p>Services: {specialist.services}</p>
          </div>
        </details>
      )}
      {mode === "candidate" && r.status === "awaiting_consent" && (
        <div className="space-y-4">
          <label className="flex max-w-2xl items-start gap-3 text-sm">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
            <span>
              I consent to sharing my submitted resume and these service requirements with{" "}
              {r.specialist_name} for an optional quotation.
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!consent || respond.isPending} onClick={() => respond.mutate(true)}>
              <Check />
              Consent & request quotation
            </Button>
            <Button
              variant="outline"
              disabled={respond.isPending}
              onClick={() => respond.mutate(false)}
            >
              <X />
              Decline referral
            </Button>
          </div>
        </div>
      )}
      {r.status === "consented" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => open().catch((e: Error) => toast.error(e.message))}
        >
          <FileText />
          View referred resume
        </Button>
      )}
      {quotes.map((q) => (
        <QuotePanel key={q.id} quote={q} mode={mode} />
      ))}
      {mode === "specialist" &&
        r.status === "consented" &&
        !quotes.some((q) => q.status === "accepted" || canAcceptQuote(q.status, q.expires_at)) && (
          <div className="mt-5">
            {quoting ? (
              <QuoteForm referral={r} onDone={() => setQuoting(false)} />
            ) : (
              <Button onClick={() => setQuoting(true)}>
                <Plus />
                Create quotation
              </Button>
            )}
          </div>
        )}
    </article>
  );
}
function QuoteForm({ referral, onDone }: { referral: Referral; onDone: () => void }) {
  const qc = useQueryClient();
  const [items, setItems] = useState<QuoteItem[]>([{ description: "", amount: 0 }]);
  const [form, setForm] = useState({
    service_name: referral.service_name,
    scope: "",
    deliverables: "",
    currency: "USD",
    delivery_days: "7",
    revisions: "1",
    exclusions: "",
    terms: "",
    expires_at: "",
  });
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("send_quotation", {
        _referral_id: referral.id,
        _quote: {
          ...form,
          delivery_days: Number(form.delivery_days),
          revisions: Number(form.revisions),
          expires_at: new Date(form.expires_at).toISOString(),
          items,
        } as Json,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Quotation sent");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="mt-6 grid gap-5 border-y border-border py-6 md:grid-cols-2"
    >
      <h3 className="text-lg font-semibold md:col-span-2">New quotation</h3>
      {(
        [
          ["service_name", "Service name"],
          ["scope", "Scope of work"],
          ["deliverables", "Deliverables"],
          ["exclusions", "Exclusions"],
          ["terms", "Terms"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="space-y-2 text-sm font-medium md:col-span-2">
          {label}
          {key === "service_name" ? (
            <Input
              required
              maxLength={200}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          ) : (
            <Textarea
              required
              maxLength={5000}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          )}
        </label>
      ))}
      <div className="space-y-3 md:col-span-2">
        <h4 className="text-sm font-semibold">Itemised price</h4>
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-[1fr_7rem_2.5rem] gap-2">
            <Input
              aria-label={`Item ${i + 1} description`}
              required
              placeholder="Service item"
              value={item.description}
              onChange={(e) =>
                setItems(items.map((x, n) => (n === i ? { ...x, description: e.target.value } : x)))
              }
            />
            <Input
              aria-label={`Item ${i + 1} amount`}
              required
              type="number"
              min="0.01"
              step="0.01"
              value={item.amount || ""}
              onChange={(e) =>
                setItems(
                  items.map((x, n) => (n === i ? { ...x, amount: Number(e.target.value) } : x)),
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove item"
              title="Remove item"
              disabled={items.length === 1}
              onClick={() => setItems(items.filter((_, n) => n !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setItems([...items, { description: "", amount: 0 }])}
        >
          <Plus />
          Add item
        </Button>
        <p className="font-semibold">Total: {money(quoteTotal(items), form.currency)}</p>
      </div>
      <label className="space-y-2 text-sm font-medium">
        Currency (3-letter code)
        <Input
          required
          pattern="[A-Za-z]{3}"
          maxLength={3}
          value={form.currency}
          onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
        />
      </label>
      <label className="space-y-2 text-sm font-medium">
        Delivery days after payment
        <Input
          required
          type="number"
          min="1"
          value={form.delivery_days}
          onChange={(e) => setForm({ ...form, delivery_days: e.target.value })}
        />
      </label>
      <label className="space-y-2 text-sm font-medium">
        Revisions included
        <Input
          required
          type="number"
          min="0"
          value={form.revisions}
          onChange={(e) => setForm({ ...form, revisions: e.target.value })}
        />
      </label>
      <label className="space-y-2 text-sm font-medium">
        Quotation expiry
        <Input
          required
          type="datetime-local"
          value={form.expires_at}
          onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
        />
      </label>
      <div className="flex gap-2 md:col-span-2">
        <Button disabled={save.isPending}>
          <Send />
          Send quotation
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
function AgreementDetails({ agreement: a }: { agreement: Agreement }) {
  return (
    <>
      <dl className="mt-5 grid gap-5 text-sm md:grid-cols-2">
        {[
          ["Scope of work", a.scope],
          ["Deliverables", a.deliverables],
          ["Exclusions", a.exclusions],
          ["Terms", a.terms],
          ["Delivery timeline", `${a.delivery_days} days after verified payment`],
          ["Revisions included", String(a.revisions)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="font-semibold">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <ul className="mt-5 divide-y divide-border text-sm">
        {a.items.map((item, i) => (
          <li key={i} className="flex justify-between gap-4 py-2">
            <span className="break-words">{item.description}</span>
            <span className="shrink-0">{money(item.amount, a.currency)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-lg font-semibold text-primary">Total {money(a.amount, a.currency)}</p>
    </>
  );
}
function QuotePanel({ quote: q, mode }: { quote: Quote; mode: Mode }) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const respond = useMutation({
    mutationFn: async (accept: boolean) => {
      const { error } = await supabase.rpc("respond_quotation", { _id: q.id, _accept: accept });
      if (error) throw error;
      return accept;
    },
    onSuccess: (accepted) => {
      qc.invalidateQueries({ queryKey });
      toast.success(accepted ? "Quotation accepted. Order awaits payment." : "Quotation declined");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const available = canAcceptQuote(q.status, q.expires_at);
  return (
    <div className="mt-7 border-l-2 border-primary pl-4 sm:pl-6">
      <h3 className="text-lg font-semibold">Quotation — {q.service_name}</h3>
      <p className="mt-1 text-xs capitalize text-muted-foreground">
        {q.status === "sent" && !available ? "Expired" : q.status} · Expires{" "}
        {new Date(q.expires_at).toLocaleString()}
      </p>
      <AgreementDetails agreement={{ ...q, items: q.items as QuoteItem[] }} />
      {mode === "candidate" && q.status === "sent" && (
        <div className="mt-5 space-y-4">
          {available && (
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={confirm} onCheckedChange={(v) => setConfirm(v === true)} />
              <span>
                I accept the price, scope, delivery timeline, revisions, exclusions and terms above.
              </span>
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!available || !confirm || respond.isPending}
              onClick={() => respond.mutate(true)}
            >
              <Check />
              Accept quotation
            </Button>
            <Button
              variant="outline"
              disabled={respond.isPending}
              onClick={() => respond.mutate(false)}
            >
              <X />
              Decline quotation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
function OrderPanel({ order: o, mode }: { order: Order; mode: Mode }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const a = o.agreement as Agreement;
  const details = useQuery({
    queryKey: ["order-details", o.id],
    enabled: expanded,
    queryFn: async () => {
      const [d, m] = await Promise.all([
        supabase
          .from("order_deliverables")
          .select("*")
          .eq("order_id", o.id)
          .order("created_at", { ascending: false }),
        supabase.from("order_messages").select("*").eq("order_id", o.id).order("created_at"),
      ]);
      if (d.error) throw d.error;
      if (m.error) throw m.error;
      return { deliveries: d.data, messages: m.data };
    },
  });
  const transition = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.rpc("transition_service_order", {
        _id: o.id,
        _status: status,
        _note: note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["order-details", o.id] });
      setNote("");
      toast.success("Order updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const message = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("send_order_message", { _id: o.id, _body: note });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order-details", o.id] });
      setNote("");
      toast.success("Message sent");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const actions = orderActions(o.status, mode, o.revisions_used, a.revisions);
  const open = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("service-deliveries")
      .createSignedUrl(path, 60);
    if (error) throw error;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  return (
    <article className="border-t border-border py-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            Order {o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-primary">{a.service_name}</h2>
          <p className="mt-1 text-sm">
            {o.candidate_name} · {o.specialist_name}
          </p>
        </div>
        <span className="rounded-md bg-secondary px-3 py-1 text-xs font-semibold capitalize">
          {statusLabel(o.status)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-5 text-sm">
        <span>{money(a.amount, a.currency)}</span>
        {o.due_at && <span>Due {new Date(o.due_at).toLocaleDateString()}</span>}
        <span>
          Revisions: {o.revisions_used} / {a.revisions}
        </span>
      </div>
      {o.status === "awaiting_payment" && <ServiceCheckout orderId={o.id} />}
      {["paid", "in_progress", "submitted_for_review", "revision_requested", "disputed"].includes(o.status) && <RefundRequest orderId={o.id} />}
      <Button
        className="mt-5"
        variant="outline"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {expanded ? "Close order" : "Open order"}
      </Button>
      {expanded && (
        <div className="mt-6">
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-primary">
              Accepted agreement
            </summary>
            <AgreementDetails agreement={a} />
          </details>
          <h3 className="mt-7 flex items-center gap-2 text-lg font-semibold">
            <Download className="h-5 w-5" />
            Document deliveries
          </h3>
          {details.isPending && <p className="mt-3 text-sm">Loading order…</p>}
          {details.isError && (
            <p role="alert" className="text-destructive">
              Could not load deliveries and messages.
            </p>
          )}
          {details.data?.deliveries.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">No documents delivered yet.</p>
          )}
          {details.data?.deliveries.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-medium">{d.file_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(d.created_at).toLocaleString()} · {Math.ceil(d.size_bytes / 1024)} KB
                </p>
                {d.note && <p className="mt-2 whitespace-pre-wrap text-sm">{d.note}</p>}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  open(d.storage_path).catch(() => toast.error("Could not open delivery"))
                }
              >
                <Download />
                Open document
              </Button>
            </div>
          ))}
          {mode === "specialist" && ["in_progress", "revision_requested"].includes(o.status) && (
            <DeliveryForm order={o} />
          )}
          <h3 className="mt-8 flex items-center gap-2 text-lg font-semibold">
            <MessageSquare className="h-5 w-5" />
            Order conversation
          </h3>
          <div className="mt-4 space-y-4">
            {details.data?.messages.map((m) => (
              <div key={m.id} className="border-l-2 border-border pl-4">
                <p className="text-xs text-muted-foreground">
                  {m.sender_id === o.candidate_user_id
                    ? o.candidate_name
                    : m.sender_id === o.specialist_user_id
                      ? o.specialist_name
                      : "Recruitment team"}{" "}
                  · {new Date(m.created_at).toLocaleString()}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{m.body}</p>
              </div>
            ))}
          </div>
          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault();
              message.mutate();
            }}
          >
            <label className="space-y-2 text-sm font-medium">
              Message
              <Textarea
                aria-label="Order message"
                rows={3}
                maxLength={5000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <Button className="mt-3" disabled={!note.trim() || message.isPending}>
              <Send />
              Send message
            </Button>
          </form>
          <div className="mt-5 flex flex-wrap gap-2">
            {actions.map((status) => (
              <Button
                key={status}
                variant={status === "completed" ? "default" : "outline"}
                disabled={
                  transition.isPending ||
                  (["revision_requested", "disputed", "awaiting_candidate_information"].includes(
                    status,
                  ) &&
                    !note.trim())
                }
                onClick={() => {
                  if (window.confirm(`${ACTION_LABELS[status]}?`)) transition.mutate(status);
                }}
              >
                {ACTION_LABELS[status]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
function DeliveryForm({ order }: { order: Order }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [inputKey, setInputKey] = useState(0);
  const upload = useMutation({
    mutationFn: async () => {
      if (!file || !user) throw new Error("Choose a document");
      const invalid = validateDocument(file);
      if (invalid) throw new Error(invalid);
      const path = `${user.id}/${order.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage
        .from("service-deliveries")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const saved = await supabase.rpc("add_order_delivery", {
        _id: order.id,
        _path: path,
        _name: file.name,
        _size: file.size,
        _mime: file.type,
        _note: note,
      });
      if (saved.error) {
        await supabase.storage.from("service-deliveries").remove([path]);
        throw saved.error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["order-details", order.id] });
      setFile(null);
      setNote("");
      setInputKey((k) => k + 1);
      toast.success("Document delivered for candidate review");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <form
      className="mt-6 space-y-4 border-y border-border py-5"
      onSubmit={(e) => {
        e.preventDefault();
        upload.mutate();
      }}
    >
      <label className="block space-y-2 text-sm font-medium">
        Final document or revised version (PDF / Word, up to 10 MB)
        <Input
          key={inputKey}
          type="file"
          accept=".pdf,.doc,.docx"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <label className="block space-y-2 text-sm font-medium">
        Delivery note
        <Textarea maxLength={5000} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <Button disabled={!file || upload.isPending}>
        <Upload />
        {upload.isPending ? "Delivering…" : "Deliver document"}
      </Button>
    </form>
  );
}

function ServiceCheckout({ orderId }: { orderId: string }) {
  const pay = useMutation({
    mutationFn: async () => {
      const { url } = await createServiceCheckout({ data: { orderId } });
      window.location.assign(url);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <div className="mt-4 space-y-3">
      <p className="border-l-2 border-warning pl-3 text-sm text-muted-foreground">The quotation is accepted. Work starts after payment.</p>
      <Button disabled={pay.isPending} onClick={() => pay.mutate()}>Pay now</Button>
    </div>
  );
}

function RefundRequest({ orderId }: { orderId: string }) {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const request = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("request_service_refund", { _order_id: orderId, _reason: reason });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Refund request sent to the recruitment team"),
    onError: (error: Error) => toast.error(error.message),
  });
  if (!open) return <Button className="mt-4" variant="ghost" size="sm" onClick={() => setOpen(true)}>Request a refund</Button>;
  return (
    <form className="mt-4 space-y-2" onSubmit={(event) => { event.preventDefault(); request.mutate(); }}>
      <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="What should be refunded, and why?" rows={3} maxLength={2000} />
      <Button type="submit" variant="outline" size="sm" disabled={request.isPending}>Submit refund request</Button>
    </form>
  );
}
