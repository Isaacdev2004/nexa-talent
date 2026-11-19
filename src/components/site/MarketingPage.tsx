import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type To = "/jobs" | "/auth" | "/contact" | "/services" | "/resources" | "/candidates" | "/employers" | "/faq";
export type Cta = { to: To; label: string; signup?: boolean };
export type Feature = { icon: LucideIcon; title: string; body: string };
export type MarketingConfig = {
  eyebrow: string;
  title: ReactNode;
  intro: string;
  image: string;
  imageAlt: string;
  primary: Cta;
  secondary?: Cta;
  pillars: [string, string][]; // short value proof points shown under the hero
  featuresTitle: string;
  featuresIntro?: string;
  features: Feature[];
  stepsTitle: string;
  steps: [string, string][];
  promiseTitle: string;
  promise: string[];
  closingTitle: string;
  closingBody: string;
};

function CtaButton({ cta, variant }: { cta: Cta; variant: "accent" | "ghost" | "primary" }) {
  const cls = variant === "accent" ? "bg-accent text-accent-foreground hover:bg-accent/90" : variant === "ghost" ? "border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" : "";
  return (
    <Button asChild size="lg" variant={variant === "ghost" ? "outline" : "default"} className={cls}>
      {cta.signup ? <Link to="/auth" search={{ mode: "signup" }}>{cta.label} <ArrowRight /></Link> : <Link to={cta.to}>{cta.label} <ArrowRight /></Link>}
    </Button>
  );
}

export function MarketingPage({ c, children }: { c: MarketingConfig; children?: ReactNode }) {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary-deep text-primary-foreground">
        <div className="container-site grid items-center gap-12 py-20 lg:grid-cols-[1.05fr_1fr] lg:py-28">
          <div>
            <p className="eyebrow text-accent">{c.eyebrow}</p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.04] md:text-6xl">{c.title}</h1>
            <p className="mt-6 max-w-xl text-lg text-primary-foreground/75">{c.intro}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <CtaButton cta={c.primary} variant="accent" />
              {c.secondary && <CtaButton cta={c.secondary} variant="ghost" />}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -bottom-4 -left-4 hidden h-full w-full rounded-lg border border-accent/40 lg:block" aria-hidden />
            <img src={c.image} alt={c.imageAlt} width={1408} height={1056} className="relative aspect-[4/3] w-full rounded-lg object-cover shadow-lift" />
          </div>
        </div>
        <div className="border-t border-primary-foreground/10">
          <dl className="container-site grid gap-px py-0 sm:grid-cols-3">
            {c.pillars.map(([k, v]) => (
              <div key={k} className="py-7 sm:px-6 sm:first:pl-0">
                <dt className="font-display text-lg font-semibold text-accent">{k}</dt>
                <dd className="mt-1 text-sm text-primary-foreground/70">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Features */}
      <section className="container-site py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="eyebrow text-muted-foreground">What you get</p>
            <h2 className="mt-3 text-3xl font-bold text-primary md:text-4xl">{c.featuresTitle}</h2>
            {c.featuresIntro && <p className="mt-4 text-muted-foreground">{c.featuresIntro}</p>}
          </div>
          <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
            {c.features.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-primary"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-5 text-xl font-semibold text-foreground">{title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {children}

      {/* Steps */}
      <section className="bg-primary text-primary-foreground">
        <div className="container-site py-24">
          <p className="eyebrow text-accent">How it works</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold md:text-5xl">{c.stepsTitle}</h2>
          <ol className="mt-14 grid gap-px overflow-hidden rounded-lg bg-primary-foreground/10 md:grid-cols-2 lg:grid-cols-4">
            {c.steps.map(([t, d], i) => (
              <li key={t} className="bg-primary p-7">
                <span className="font-display text-4xl font-extrabold text-accent">0{i + 1}</span>
                <h3 className="mt-6 text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-primary-foreground/70">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Promise */}
      <section className="container-site grid gap-12 py-24 lg:grid-cols-2">
        <h2 className="text-3xl font-bold text-primary md:text-5xl">{c.promiseTitle}</h2>
        <ul className="space-y-5">
          {c.promise.map((p) => (
            <li key={p} className="flex gap-4 border-b border-border pb-5 text-lg"><Check className="mt-1 h-5 w-5 shrink-0 text-accent" />{p}</li>
          ))}
        </ul>
      </section>

      {/* Closing */}
      <section className="container-site pb-24">
        <div className="relative overflow-hidden rounded-lg bg-primary-deep px-8 py-16 text-primary-foreground md:px-16">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-primary [clip-path:polygon(30%_0,100%_0,100%_100%,0_100%)]" aria-hidden />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl font-bold md:text-4xl">{c.closingTitle}</h2>
            <p className="mt-4 text-primary-foreground/75">{c.closingBody}</p>
            <div className="mt-8 flex flex-wrap gap-3"><CtaButton cta={c.primary} variant="accent" />{c.secondary && <CtaButton cta={c.secondary} variant="ghost" />}</div>
          </div>
        </div>
      </section>
    </>
  );
}
