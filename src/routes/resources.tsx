import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/site/ContentPage";

const TITLE = "Career resources — NexaTalent";
const DESC = "Practical guidance on resumes, interviews and professional positioning.";

const guides = [
  { cat: "Resume strategy", title: "Tailoring one resume to different job descriptions", body: "Start from a master resume, then for each role reorder achievements so the three most relevant appear first, mirror the job's own terminology for skills you genuinely have, and remove anything that doesn't support the application." },
  { cat: "Interview preparation", title: "Answering competency questions naturally", body: "Prepare five short stories about real situations — a challenge, a disagreement, a failure, a success and a change you led. Each should cover the situation, what you did and the measurable result in under two minutes." },
  { cat: "Career development", title: "Planning a move after restructuring", body: "Take a week to document your achievements while they're fresh, decide which roles you want rather than which you could do, and tell your network specifically what you're looking for." },
  { cat: "Professional positioning", title: "Writing a headline recruiters search for", body: "Use the job title you want, your specialism and one proof point. Recruiters search by title and skill, so plain language beats clever phrasing." },
  { cat: "Job application guidance", title: "Before you click submit", body: "Check the closing date, confirm your resume is the version tailored to this role, re-read the job's requirements against your answers, and keep a copy of what you sent." },
];

export const Route = createFileRoute("/resources")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }] }),
  component: Resources,
});

function Resources() {
  return (
    <ContentPage eyebrow="Career resources" title="Smarter moves start with better advice." intro="Practical, no-fluff guidance on resumes, interviews and positioning yourself for the roles you want.">
      <section className="container-site py-20">
        {guides[0] && (
          <article className="grid gap-10 rounded-lg border border-border bg-surface p-8 md:p-12 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="eyebrow text-accent">Featured guide</p>
              <p className="mt-3 text-sm text-muted-foreground">{guides[0].cat}</p>
              <h2 className="mt-3 text-3xl font-bold text-primary md:text-4xl">{guides[0].title}</h2>
            </div>
            <p className="self-end text-lg leading-relaxed text-foreground/80">{guides[0].body}</p>
          </article>
        )}
        <div className="mt-16 grid gap-x-10 gap-y-14 md:grid-cols-2">
          {guides.slice(1).map((g, i) => (
            <article key={g.title} className="group grid grid-cols-[3.5rem_1fr] gap-5">
              <span className="font-display text-3xl font-extrabold text-accent">0{i + 2}</span>
              <div className="border-t border-border pt-4">
                <p className="eyebrow text-muted-foreground">{g.cat}</p>
                <h2 className="mt-3 text-2xl font-semibold text-primary">{g.title}</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">{g.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </ContentPage>
  );
}
