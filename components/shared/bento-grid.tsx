import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useRef } from "react";

import { FeaturedProjectCard } from "@/components/shared/featured-project-card";
import { ProjectCard } from "@/components/shared/project-card";
import {
  advanceHighlightEntries,
  createHighlightEntryState,
} from "@/lib/highlight-pulse";
import type { Project } from "@/lib/types";

type BentoGridProps = {
  projects: Project[];
  highlightedIds: string[];
};

const layoutSpring = {
  type: "spring" as const,
  stiffness: 260,
  damping: 30,
  mass: 0.9,
};

export function BentoGrid({ projects, highlightedIds }: BentoGridProps) {
  const featuredProjects = projects.filter((project) => project.featured);
  const supportingProjects = projects.filter((project) => !project.featured);
  const highlightSet = new Set(highlightedIds);
  const hasHighlights = highlightSet.size > 0;
  const shouldReduceMotion = useReducedMotion();
  const animateLayout = !shouldReduceMotion;

  // One-time pulse per card ENTERING the highlight set (req 19): each
  // highlighted id is tracked with the epoch at which it entered, so when a
  // new set overlaps the previous one only the genuinely new cards remount
  // their overlay and pulse — survivors keep their finished overlay, and an
  // identical resubmit changes nothing. Clearing highlights resets the
  // entries, so a card re-entering on a later filter pulses again. The
  // render-phase ref write is idempotent (an unchanged set returns the same
  // state object — StrictMode-safe).
  const pulseRef = useRef(createHighlightEntryState());
  pulseRef.current = advanceHighlightEntries(pulseRef.current, highlightedIds);
  const pulseEntries = pulseRef.current.entries;

  return (
    <section
      id="experience"
      aria-labelledby="experience-heading"
      className="section-shell"
    >
      <div className="page-shell space-y-8">
        <div className="space-y-3">
          <p className="section-kicker">Experience</p>
          <h2 id="experience-heading" className="section-heading">
            15+ years of platform engineering, team leadership, and AI systems.
          </h2>
          <p className="section-copy">
            Roles reorder and highlight based on search and skill graph
            interactions.
          </p>
          {/* Single source of truth for filter-state announcements (the
              skill web stays silent to avoid duplicate polite messages).
              Always mounted so both applying AND clearing a filter announce. */}
          <p className="sr-only" aria-live="polite">
            {hasHighlights
              ? "Filter active: matching roles use a warm border and left accent; other roles are de-emphasized."
              : "Showing all roles."}
          </p>
        </div>

        <LayoutGroup>
          <div className="grid gap-4 lg:grid-cols-4 lg:gap-5">
            {featuredProjects.map((project, index) => {
              const isInMatchSet = highlightSet.has(project.id);

              return (
                <motion.div
                  key={project.id}
                  layout={animateLayout}
                  transition={{ layout: layoutSpring }}
                  className="lg:col-span-2"
                >
                  <FeaturedProjectCard
                    project={project}
                    isDimmed={hasHighlights && !isInMatchSet}
                    showMatchEmphasis={hasHighlights && isInMatchSet}
                    pulseEpoch={pulseEntries.get(project.id) ?? 0}
                    index={index}
                  />
                </motion.div>
              );
            })}

            {supportingProjects.map((project, index) => {
              const isInMatchSet = highlightSet.has(project.id);
              const spanClass = index === 2 ? "lg:col-span-2" : "lg:col-span-1";

              return (
                <motion.div
                  key={project.id}
                  layout={animateLayout}
                  transition={{ layout: layoutSpring }}
                  className={spanClass}
                >
                  <ProjectCard
                    project={project}
                    isDimmed={hasHighlights && !isInMatchSet}
                    showMatchEmphasis={hasHighlights && isInMatchSet}
                    pulseEpoch={pulseEntries.get(project.id) ?? 0}
                    index={index + featuredProjects.length}
                  />
                </motion.div>
              );
            })}
          </div>
        </LayoutGroup>
      </div>
    </section>
  );
}
