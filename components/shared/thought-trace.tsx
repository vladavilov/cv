import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type ThoughtTraceStep = {
  label: string;
  state: "idle" | "active" | "done";
};

type ThoughtTraceProps = {
  steps: ThoughtTraceStep[];
};

export function ThoughtTrace({ steps }: ThoughtTraceProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step) => {
        const isActive = step.state === "active";
        const isDone = step.state === "done";

        return (
          <span
            key={step.label}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs text-[#5e5d59]",
              isActive && "text-[#87867f]",
              isDone && "text-[#5e5d59]",
            )}
          >
            {isActive ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-3 text-[#87867f] motion-safe:animate-spin"
              />
            ) : isDone ? (
              <span className="text-[#5e5d59]">✓</span>
            ) : null}
            {step.label}
            {step !== steps[steps.length - 1] && (
              <span className="ml-1 text-[#3d3d3a]">→</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
