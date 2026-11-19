import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string; inverted?: boolean }) {
  return (
    <Link to="/" aria-label="NexaTalent" className={cn("inline-flex items-center", className)}>
      <img src="/nexa-talent-logo.png" alt="" className="h-11 w-auto" />
    </Link>
  );
}
