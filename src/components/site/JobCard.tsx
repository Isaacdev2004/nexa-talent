import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Briefcase, CalendarClock, MapPin } from "lucide-react";
import { formatClosingDate, type PublicJob } from "@/lib/jobs";
import { cn } from "@/lib/utils";

export function JobCard({ job, featured }: { job: PublicJob; featured?: boolean }) {
  return (
    <Link
      to="/jobs/$slug"
      params={{ slug: job.slug }}
      className={cn(
        "group relative flex flex-col justify-between rounded-lg border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift",
        featured && "md:p-8",
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-medium text-muted-foreground">{job.employer}</p>
          <span className="flex gap-1.5">{job.isDemo && <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">Demo</span>}<span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{job.arrangement}</span></span>
        </div>
        <h3 className={cn("mt-3 font-semibold text-foreground group-hover:text-primary", featured ? "text-2xl md:text-3xl" : "text-xl")}>{job.title}</h3>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{job.location}, {job.country}</span>
          <span className="inline-flex items-center gap-1.5"><Briefcase className="h-4 w-4" />{job.employmentType}</span>
        </div>
        {job.salary && <p className="mt-4 text-sm font-semibold text-foreground">{job.salary}</p>}
      </div>
      <div className="mt-8 flex items-center justify-between border-t border-border pt-4 text-sm">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground"><CalendarClock className="h-4 w-4" />Closes {formatClosingDate(job.closingDate)}</span>
        <span className="inline-flex items-center gap-1 font-medium text-primary">View opportunity <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
      </div>
    </Link>
  );
}
