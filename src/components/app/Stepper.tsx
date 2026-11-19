import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-3" aria-label="Progress">
      {steps.map((s, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={s} className="flex items-center gap-2 text-sm" aria-current={active ? "step" : undefined}>
            <span className={cn("grid h-6 w-6 place-items-center rounded-full border text-xs font-semibold transition-colors",
              done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary text-primary" : "border-border text-muted-foreground")}>
              {done ? <Check className="h-3.5 w-3.5" /> : n}
            </span>
            <span className={cn(active ? "font-medium text-foreground" : "text-muted-foreground")}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
