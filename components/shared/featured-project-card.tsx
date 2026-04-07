import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

type FeaturedProjectCardProps = {
  project: Project;
  isDimmed: boolean;
  /** Strong “matches filter” styling when the grid is narrowed by search/skills */
  showMatchEmphasis: boolean;
  index: number;
};

export function FeaturedProjectCard({
  project,
  isDimmed,
  showMatchEmphasis,
  index,
}: FeaturedProjectCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.article
      layout={!shouldReduceMotion}
      aria-current={showMatchEmphasis ? "true" : undefined}
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
      whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      whileHover={shouldReduceMotion || isDimmed ? undefined : { y: -6 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.32,
        ease: "easeOut",
        delay: shouldReduceMotion ? 0 : index * 0.07,
      }}
      className={cn(
        "h-full",
        isDimmed && "opacity-[0.42] saturate-[0.55]",
        showMatchEmphasis && !shouldReduceMotion && "relative z-[1]",
      )}
    >
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-lg border bg-[#30302e] p-5 transition-[border-color,box-shadow,background-color,filter] duration-200 md:p-6",
          !showMatchEmphasis && !isDimmed && "border-[#30302e]",
          showMatchEmphasis &&
            "border-[#c96442]/80 bg-[#2f2e2b] shadow-[0_0_0_1px_rgba(201,100,66,0.45),0_24px_64px_-8px_rgba(201,100,66,0.22),0_12px_32px_-12px_rgba(0,0,0,0.45)]",
          showMatchEmphasis &&
            "before:pointer-events-none before:absolute before:inset-y-4 before:left-0 before:w-1 before:rounded-r before:bg-[#c96442] before:content-['']",
          isDimmed && "border-[#252524] bg-[#222120]",
        )}
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="rounded-md bg-[#c96442] px-2.5 py-1 text-xs font-medium uppercase tracking-[0.5px] text-[#faf9f5]">
            {project.company}
          </span>
          <span className="text-xs text-[#87867f]">{project.period}</span>
        </div>

        <h3 className="font-[family-name:var(--font-heading)] text-2xl font-medium leading-tight text-foreground md:text-[1.9rem]">
          {project.title}
        </h3>

        <p className="mt-3 text-base leading-relaxed text-[#87867f]">
          {project.summary}
        </p>

        {project.responsibilities.length > 0 && (
          <ul className="mt-5 space-y-2">
            {project.responsibilities.map((r) => (
              <li
                key={r}
                className="flex items-start gap-2 text-[15px] leading-relaxed text-[#b0aea5]"
              >
                <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-[#c96442]" />
                {r}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex flex-wrap gap-1.5 pt-6">
          {project.stack.map((item) => (
            <span
              key={item}
              className="rounded-md border border-[#3d3d3a] bg-[#141413] px-2 py-0.5 text-xs text-[#87867f]"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </motion.article>
  );
}
