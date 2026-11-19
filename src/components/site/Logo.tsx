import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 font-display text-lg font-bold tracking-tight", inverted ? "text-primary-foreground" : "text-primary", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-md bg-accent text-accent-foreground">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M5 19V5l14 14V5" /></svg>
      </span>
      NexaTalent
    </Link>
  );
}
