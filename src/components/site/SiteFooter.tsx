import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

const cols = [
  { title: "Platform", links: [["/jobs", "Find Jobs"], ["/candidates", "Candidates"], ["/employers", "Employers"], ["/services", "Services"]] },
  { title: "Network", links: [["/recruiters", "Recruiters"], ["/specialists", "Specialists"], ["/resources", "Resources"], ["/about", "About"]] },
  { title: "Support", links: [["/contact", "Contact"], ["/faq", "FAQ"], ["/privacy", "Privacy"], ["/terms", "Terms"]] },
] as const;

export function SiteFooter() {
  return (
    <footer className="bg-primary-deep text-primary-foreground">
      <div className="container-site grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm">
          <Logo inverted />
          <p className="mt-4 text-sm leading-relaxed text-primary-foreground/65">
            A global recruitment platform connecting professionals with verified opportunities, recruitment teams and independent career specialists.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="eyebrow text-accent">{c.title}</p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map(([to, label]) => (
                <li key={to}><Link to={to} className="text-sm text-primary-foreground/75 transition-colors hover:text-primary-foreground">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-primary-foreground/10">
        <div className="container-site flex flex-col justify-between gap-2 py-6 text-xs text-primary-foreground/50 md:flex-row">
          <p>© {new Date().getFullYear()} NexaTalent. All rights reserved.</p>
          <p>Professional services are optional and never a condition of any application.</p>
        </div>
      </div>
    </footer>
  );
}
