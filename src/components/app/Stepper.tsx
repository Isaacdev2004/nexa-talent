import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({ steps, current, onStep }: { steps: string[]; current: number; onStep?: (step: number) => void }) {
  return (
    <ol className="flex w-full" aria-label="Progress">
      {steps.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        const canOpen = Boolean(onStep) && done;
        return (
          <li key={label} className="relative flex min-w-0 flex-1 flex-col items-center text-center" aria-current={active ? "step" : undefined}>
            {index > 0 && <span aria-hidden="true" className={cn("absolute right-1/2 top-3 h-0.5 w-full", done || active ? "bg-primary" : "bg-border")} />}
            <button
              type="button"
              disabled={!canOpen}
              onClick={() => canOpen && onStep?.(step)}
              className={cn(
                "relative z-10 grid h-6 w-6 place-items-center rounded-full border text-xs font-semibold",
                done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary bg-background text-primary" : "border-border bg-background text-muted-foreground",
                canOpen && "cursor-pointer",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : step}
              <span className="sr-only">{label}</span>
            </button>
            <span className={cn("mt-2 block max-w-full px-0.5 text-[10px] leading-tight sm:text-[11px]", active ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
