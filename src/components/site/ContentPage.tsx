import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type Cta = { to: "/jobs" | "/auth" | "/contact" | "/services" | "/resources"; label: string; signup?: boolean };

export function ContentPage({ eyebrow, title, intro, points, cta, children }: { eyebrow: string; title: string; intro: string; points?: [string, string][]; cta?: Cta; children?: ReactNode }) {
  return (
    <>
      <section className="relative overflow-hidden bg-primary-deep text-primary-foreground">
        <div className="absolute -right-24 top-0 h-full w-1/2 bg-primary [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" aria-hidden />
        <div className="container-site relative py-20 md:py-28">
          <p className="eyebrow text-accent">{eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.05] md:text-6xl">{title}</h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/75">{intro}</p>
          {cta && (
            <Button asChild size="lg" className="mt-10 bg-accent text-accent-foreground hover:bg-accent/90">
              {cta.signup ? <Link to="/auth" search={{ mode: "signup" }}>{cta.label} <ArrowRight /></Link> : <Link to={cta.to}>{cta.label} <ArrowRight /></Link>}
            </Button>
          )}
        </div>
      </section>
      {points && (
        <section className="container-site py-20">
          <ol className="grid gap-x-12 gap-y-10 md:grid-cols-2">
            {points.map(([t, d], i) => (
              <li key={t} className="grid grid-cols-[3rem_1fr] gap-4 border-t border-border pt-6">
                <span className="font-display text-2xl font-bold text-accent">0{i + 1}</span>
                <div><h2 className="text-xl font-semibold text-foreground">{t}</h2><p className="mt-2 text-muted-foreground">{d}</p></div>
              </li>
            ))}
          </ol>
        </section>
      )}
      {children}
    </>
  );
}
