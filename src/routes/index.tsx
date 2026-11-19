import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Check, FileText, Globe2, Handshake, Lock, MapPin, Search, Sparkles, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JobCard } from "@/components/site/JobCard";
import { useSuspenseQuery } from "@tanstack/react-query";
import { jobsQuery } from "@/lib/jobs.queries";
import heroImg from "@/assets/hero-office.jpg";
import employerImg from "@/assets/employer-team.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NexaTalent — Find your next opportunity" },
      { name: "description", content: "Discover verified career opportunities worldwide, connect with recruitment professionals and access optional career support." },
      { property: "og:title", content: "NexaTalent — Find your next opportunity" },
      { property: "og:description", content: "Discover verified career opportunities worldwide, connect with recruitment professionals and access optional career support." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(jobsQuery({ limit: 5 })),
  component: Index,
});

const trust = [
  { icon: Globe2, label: "Global opportunities" },
  { icon: BadgeCheck, label: "Verified vacancies" },
  { icon: Lock, label: "Privacy-conscious" },
  { icon: Handshake, label: "Human recruitment support" },
  { icon: Sparkles, label: "Optional career services" },
];

const steps = [
  ["Create your profile", "Add your experience, skills and preferences once, and keep your resumes in a private library."],
  ["Discover opportunities", "Explore verified roles, or receive a direct link from a recruiter who has matched you."],
  ["Apply with confidence", "Submit a structured application directly on the platform and receive an acknowledgement."],
  ["Follow your progress", "See where each application stands, from review to interview and beyond."],
];

const services = ["Resume restructuring", "ATS-focused resume optimisation", "Cover letter preparation", "LinkedIn profile optimisation", "Supporting application documents", "Interview preparation"];

const resources = [
  ["Resume strategy", "How to tailor one resume to five very different job descriptions"],
  ["Interview preparation", "Structuring answers to competency questions without sounding rehearsed"],
  ["Career development", "Planning a move after restructuring: the first 30 days"],
  ["Professional positioning", "Writing a LinkedIn headline that recruiters actually search for"],
];

function Index() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const search: { q?: string; location?: string } = {};
    if (q.trim()) search.q = q.trim();
    if (loc.trim()) search.location = loc.trim();
    navigate({ to: "/jobs", search });
  };
  const { data: featured } = useSuspenseQuery(jobsQuery({ limit: 5 }));
  const [lead, ...rest] = featured;

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-primary-deep text-primary-foreground">
        <img src={heroImg} alt="Two professionals discussing work in a modern office" width={1920} height={1088} className="absolute inset-0 -z-20 h-full w-full object-cover object-[70%_center]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-deep via-primary-deep/90 to-primary-deep/30" />
        <div className="container-site py-24 md:py-36">
          <p className="eyebrow text-accent">Global recruitment, human support</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-extrabold leading-[1.02] md:text-7xl">
            Find your next opportunity. <span className="text-accent">Build your next chapter.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-primary-foreground/80">
            Discover meaningful career opportunities, connect with recruitment professionals and access the support you need to move forward.
          </p>
          <form onSubmit={submit} className="mt-10 grid max-w-3xl gap-2 rounded-lg bg-surface p-2 shadow-lift md:grid-cols-[1.2fr_1fr_auto]">
            <label className="flex items-center gap-2 px-3 text-foreground"><Search className="h-4 w-4 shrink-0 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title or keyword" aria-label="Job title or keyword" className="border-0 shadow-none focus-visible:ring-0" /></label>
            <label className="flex items-center gap-2 px-3 text-foreground md:border-l md:border-border"><MapPin className="h-4 w-4 shrink-0 text-muted-foreground" /><Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="City, country or remote" aria-label="Location" className="border-0 shadow-none focus-visible:ring-0" /></label>
            <Button type="submit" size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">Search jobs</Button>
          </form>
          <div className="mt-6 flex flex-wrap gap-6 text-sm font-medium">
            <Link to="/jobs" className="inline-flex items-center gap-1.5 hover:text-accent">Explore jobs <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/auth" search={{ mode: "signup" }} className="inline-flex items-center gap-1.5 text-primary-foreground/80 hover:text-accent">Join the network <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-b border-border bg-surface">
        <div className="container-site grid grid-cols-2 gap-6 py-8 md:grid-cols-5">
          {trust.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 text-sm font-medium text-foreground"><Icon className="h-5 w-5 shrink-0 text-primary" />{label}</div>
          ))}
        </div>
      </section>

      {/* Featured jobs */}
      <section className="container-site py-24">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow text-muted-foreground">Featured opportunities</p>
            <h2 className="mt-3 max-w-xl text-3xl font-bold text-primary md:text-5xl">Roles open right now, around the world.</h2>
          </div>
          <Button asChild variant="outline"><Link to="/jobs">View all jobs <ArrowRight /></Link></Button>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {lead && <div className="lg:row-span-2"><div className="h-full [&>a]:h-full"><JobCard job={lead} featured /></div></div>}
          {rest.slice(0, 4).map((j) => <JobCard key={j.slug} job={j} />)}
        </div>
        {featured.length === 0 && <p className="text-muted-foreground">New opportunities are being added. Check back soon.</p>}
        {featured.some((j) => j.isDemo) && <p className="mt-4 text-xs text-muted-foreground">Listings marked "Demo" are sample content.</p>}
      </section>

      {/* Candidate journey */}
      <section className="bg-primary text-primary-foreground">
        <div className="container-site grid gap-16 py-24 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="eyebrow text-accent">For candidates</p>
            <h2 className="mt-3 text-3xl font-bold md:text-5xl">Your next career move starts with the right opportunity.</h2>
            <Button asChild size="lg" className="mt-10 bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/auth" search={{ mode: "signup" }}>Create your profile <ArrowRight /></Link></Button>
          </div>
          <ol className="divide-y divide-primary-foreground/15 border-y border-primary-foreground/15">
            {steps.map(([t, d], i) => (
              <li key={t} className="grid grid-cols-[3rem_1fr] gap-4 py-6">
                <span className="font-display text-2xl font-bold text-accent">0{i + 1}</span>
                <div><h3 className="text-xl font-semibold">{t}</h3><p className="mt-1.5 text-primary-foreground/70">{d}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Employers */}
      <section className="container-site grid items-center gap-14 py-24 lg:grid-cols-2">
        <img src={employerImg} alt="A hiring manager and recruiter reviewing candidates together" width={1200} height={1408} loading="lazy" className="aspect-[4/5] w-full rounded-lg object-cover lg:max-h-[620px]" />
        <div>
          <p className="eyebrow text-muted-foreground">For employers</p>
          <h2 className="mt-3 text-3xl font-bold text-primary md:text-5xl">Find the people who move your business forward.</h2>
          <div className="mt-10 space-y-8">
            <div className="border-l-2 border-accent pl-6">
              <p className="eyebrow text-primary">Self-service recruitment</p>
              <p className="mt-2 text-muted-foreground">Create a company profile, submit vacancies and manage applicants in one place.</p>
            </div>
            <div className="border-l-2 border-primary pl-6">
              <p className="eyebrow text-primary">Recruiter-supported</p>
              <p className="mt-2 text-muted-foreground">Work with our specialists on talent sourcing, screening, interviews and recruitment coordination.</p>
            </div>
          </div>
          <Button asChild size="lg" className="mt-10"><Link to="/contact">Make an employer enquiry <ArrowRight /></Link></Button>
        </div>
      </section>

      {/* Services */}
      <section className="bg-surface">
        <div className="container-site grid gap-14 py-24 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="eyebrow text-muted-foreground">Professional services</p>
            <h2 className="mt-3 text-3xl font-bold text-primary md:text-5xl">Optional support from independent specialists.</h2>
            <p className="mt-6 max-w-lg text-muted-foreground">If a review suggests your documents could be stronger, you may choose to work with an independent specialist. You agree the scope and quote before any work begins.</p>
            <div className="mt-8 rounded-md border border-border bg-background p-4 text-sm text-foreground">
              <strong className="font-semibold">Always optional.</strong> Applying and being considered never depends on buying a service, and services don't guarantee interviews, employment or screening results.
            </div>
            <Button asChild variant="outline" size="lg" className="mt-8"><Link to="/services">Explore professional services <ArrowRight /></Link></Button>
          </div>
          <ul className="grid content-start gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
            {services.map((s) => (
              <li key={s} className="flex items-center gap-3 bg-surface p-5 text-sm font-medium"><FileText className="h-4 w-4 shrink-0 text-primary" />{s}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Recruiters + specialists */}
      <section className="container-site grid gap-px py-24 md:grid-cols-2">
        {[
          { icon: UserRound, eyebrow: "Independent recruiters", title: "Source talent on authorised assignments.", body: "Join our recruitment partner network and contribute to verified recruitment assignments with clear terms.", to: "/recruiters" as const, cta: "Join as a recruiter" },
          { icon: FileText, eyebrow: "Document specialists", title: "Turn your expertise into steady referrals.", body: "Receive referrals, send quotations and deliver professional documents securely through the platform.", to: "/specialists" as const, cta: "Become a specialist" },
        ].map(({ icon: Icon, ...c }, i) => (
          <div key={c.to} className={i === 0 ? "pb-12 md:border-r md:border-border md:pb-0 md:pr-12" : "border-t border-border pt-12 md:border-t-0 md:pl-12 md:pt-0"}>
            <Icon className="h-6 w-6 text-primary" />
            <p className="eyebrow mt-6 text-muted-foreground">{c.eyebrow}</p>
            <h3 className="mt-3 text-2xl font-bold text-primary md:text-3xl">{c.title}</h3>
            <p className="mt-4 max-w-md text-muted-foreground">{c.body}</p>
            <Link to={c.to} className="mt-6 inline-flex items-center gap-1.5 font-semibold text-primary hover:gap-2.5 transition-all">{c.cta} <ArrowRight className="h-4 w-4" /></Link>
          </div>
        ))}
      </section>

      {/* Resources */}
      <section className="border-t border-border">
        <div className="container-site py-24">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow text-muted-foreground">Career resources</p>
              <h2 className="mt-3 text-3xl font-bold text-primary md:text-4xl">Guidance for every stage of your search.</h2>
            </div>
            <Link to="/resources" className="hidden items-center gap-1.5 text-sm font-semibold text-primary md:inline-flex">All resources <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {resources.map(([cat, title]) => (
              <Link key={title} to="/resources" className="group border-t-2 border-foreground pt-5">
                <p className="eyebrow text-muted-foreground">{cat}</p>
                <h3 className="mt-3 text-lg font-semibold leading-snug group-hover:text-primary">{title}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-accent text-accent-foreground">
        <div className="container-site flex flex-col items-start justify-between gap-8 py-20 md:flex-row md:items-center">
          <h2 className="max-w-2xl text-4xl font-extrabold md:text-6xl">Your next opportunity starts here.</h2>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-primary-deep text-primary-foreground hover:bg-primary"><Link to="/jobs">Find opportunities</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-primary-deep bg-transparent text-accent-foreground hover:bg-primary-deep/10"><Link to="/auth" search={{ mode: "signup" }}><Check /> Join the network</Link></Button>
          </div>
        </div>
      </section>
    </>
  );
}
