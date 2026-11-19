import { statusLabels } from "@/lib/candidate";
import { cn } from "@/lib/utils";

const tone: Record<string, string> = {
  submitted: "bg-secondary text-secondary-foreground",
  under_review: "bg-warning/15 text-foreground",
  shortlisted: "bg-success/15 text-success",
  interview_scheduled: "bg-success/15 text-success",
  interviewed: "bg-success/15 text-success",
  offered: "bg-accent text-accent-foreground",
  hired: "bg-success text-primary-foreground",
  rejected: "bg-muted text-muted-foreground",
  withdrawn: "bg-muted text-muted-foreground",
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", tone[status] ?? "bg-muted")}>{statusLabels[status] ?? status}</span>;
}
