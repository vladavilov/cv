import { LoaderCircle } from "lucide-react";

import type { TraceStep } from "@/lib/experience-search-reducer";
import { cn } from "@/lib/utils";

export type ThoughtTraceStep = TraceStep;

type ThoughtTraceProps = {
  steps: ThoughtTraceStep[];
};

export function ThoughtTrace({ steps }: ThoughtTraceProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step) => {
        const isActive = step.state === "active";
        const isDone = step.state === "done";
        const isSkipped = step.state === "skipped";

        return (
          <span
            key={step.label}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs text-foreground-faint",
              isActive && "text-muted-foreground",
              isDone && "text-foreground-faint",
              isSkipped && "text-foreground-faint/70",
            )}
          >
            {isActive ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-3 text-muted-foreground motion-safe:animate-spin"
              />
            ) : isDone ? (
              <span aria-hidden="true" className="text-foreground-faint">
                ✓
              </span>
            ) : isSkipped ? (
              <span aria-hidden="true" className="text-foreground-faint/70">
                –
              </span>
            ) : null}
            {step.label}
            {isDone ? <span className="sr-only">(done)</span> : null}
            {isSkipped ? <span className="sr-only">(skipped)</span> : null}
            {step !== steps[steps.length - 1] && (
              <span className="ml-1 text-secondary">→</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
