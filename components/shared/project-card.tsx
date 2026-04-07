import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

type ProjectCardProps = {
  project: Project;
  isHighlighted: boolean;
  isDimmed: boolean;
  index: number;
};

export function ProjectCard({
  project,
  isHighlighted,
  isDimmed,
  index,
}: ProjectCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.article
      layout={!shouldReduceMotion}
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      whileInView={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.28,
        ease: "easeOut",
        delay: shouldReduceMotion ? 0 : index * 0.05,
      }}
      className={cn("h-full", isDimmed && "opacity-45")}
    >
      <div
        className={cn(
          "flex h-full flex-col rounded-lg border border-[#30302e] bg-[#30302e] p-5 transition-[opacity,border-color,box-shadow] md:p-6",
          isHighlighted &&
            "border-[#c96442]/40 shadow-[0_0_0_1px_rgba(201,100,66,0.18)]",
        )}
      >
        <div className="mb-2 flex items-center gap-3">
          <span className="rounded-md border border-[#3d3d3a] bg-[#141413] px-2 py-0.5 text-xs text-[#87867f]">
            {project.company}
          </span>
          <span className="text-xs text-[#5e5d59]">{project.period}</span>
        </div>

        <h3 className="font-[family-name:var(--font-heading)] text-lg font-medium text-foreground">
          {project.title}
        </h3>

        <p className="mt-2 text-[15px] leading-relaxed text-[#87867f]">
          {project.summary}
        </p>

        {project.responsibilities.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {project.responsibilities.map((r) => (
              <li
                key={r}
                className="flex items-start gap-2 text-sm leading-relaxed text-[#b0aea5]"
              >
                <span className="mt-1.5 block size-1 shrink-0 rounded-full bg-[#5e5d59]" />
                {r}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex flex-wrap gap-1.5 pt-5">
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
