"use client";

import { useEffect, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const SIZE = 28;
const STROKE_WIDTH = 2.5;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type ProgressRingProps = {
  /** Exploration progress as an integer 0–100. */
  progress: number;
  /** True once stored session progress has been applied (see use-exploration). */
  hydrated: boolean;
};

/**
 * Small exploration-progress ring for the status header. `role="img"` with a
 * value-bearing label; the tooltip explains what the ring is on hover AND
 * keyboard focus (the trigger is focusable). The stroke transition is
 * motion-safe and armed only after the first post-hydration paint, so the
 * 0 → stored% restore renders instantly instead of animating like freshly
 * earned progress; live increments afterwards animate.
 */
export function ProgressRing({ progress, hydrated }: ProgressRingProps) {
  const [transitionArmed, setTransitionArmed] = useState(false);

  useEffect(() => {
    if (!hydrated || transitionArmed) {
      return;
    }
    // Two frames: the hydrated value must be committed and painted before
    // the transition class appears, otherwise the restore jump animates.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setTransitionArmed(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [hydrated, transitionArmed]);

  const percent = Math.round(Math.min(100, Math.max(0, progress)));
  const offset = CIRCUMFERENCE * (1 - percent / 100);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <span
              tabIndex={0}
              role="img"
              aria-label={`Exploration progress: ${percent}%`}
              className="inline-flex shrink-0 rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          }
        >
          <svg
            aria-hidden="true"
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="block -rotate-90"
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE_WIDTH}
              className="stroke-border"
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              className={cn(
                "stroke-primary",
                transitionArmed &&
                  "motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700 motion-safe:ease-out",
              )}
            />
          </svg>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Exploration progress — fills as you ask, filter, and uncover projects.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
