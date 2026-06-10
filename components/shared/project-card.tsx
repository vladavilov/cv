import { motion, useReducedMotion } from "framer-motion";

import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

type ProjectCardProps = {
  project: Project;
  isDimmed: boolean;
  showMatchEmphasis: boolean;
  /** Epoch at which THIS card entered the highlight set; keys the one-time pulse. */
  pulseEpoch: number;
  index: number;
};

export function ProjectCard({
  project,
  isDimmed,
  showMatchEmphasis,
  pulseEpoch,
  index,
}: ProjectCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.article
      aria-current={showMatchEmphasis ? "true" : undefined}
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      whileHover={shouldReduceMotion || isDimmed ? undefined : { y: -4, scale: 1.01 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.28,
        ease: "easeOut",
        delay: shouldReduceMotion ? 0 : index * 0.05,
      }}
      className={cn(
        "h-full",
        isDimmed && "opacity-[0.42] saturate-[0.55]",
        showMatchEmphasis && !shouldReduceMotion && "relative z-[1]",
      )}
    >
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-lg border bg-card p-5 transition-[border-color,box-shadow,background-color,filter] duration-200 md:p-6",
          !showMatchEmphasis && !isDimmed && "border-border",
          showMatchEmphasis && "match-glow border-primary/75 bg-card-highlight",
          showMatchEmphasis &&
            "before:pointer-events-none before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-r before:bg-primary before:content-['']",
          isDimmed && "border-border-dim bg-card-dim",
        )}
      >
        {/* Single quiet pulse when this card ENTERS the highlight set: keyed
            by the card's own entry epoch, so surviving a set change or an
            identical resubmit never replays it. */}
        {showMatchEmphasis && !shouldReduceMotion ? (
          <span
            key={pulseEpoch}
            aria-hidden="true"
            className="match-pulse-overlay pointer-events-none absolute inset-0 rounded-lg"
          />
        ) : null}
        <div className="mb-2 flex items-center gap-3">
          <Chip variant="tag">{project.company}</Chip>
          <span className="text-xs text-foreground-faint">{project.period}</span>
        </div>

        <h3 className="font-[family-name:var(--font-heading)] text-lg font-medium text-foreground">
          {project.title}
        </h3>

        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          {project.summary}
        </p>

        {project.responsibilities.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {project.responsibilities.map((r) => (
              <li
                key={r}
                className="flex items-start gap-2 text-sm leading-relaxed text-foreground-soft"
              >
                <span className="mt-1.5 block size-1 shrink-0 rounded-full bg-foreground-faint" />
                {r}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex flex-wrap gap-1.5 pt-5">
          {project.stack.map((item) => (
            <Chip key={item} variant="tag">
              {item}
            </Chip>
          ))}
        </div>
      </div>
    </motion.article>
  );
}
