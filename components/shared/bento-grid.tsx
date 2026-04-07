import { motion, useReducedMotion } from "framer-motion";

import { FeaturedProjectCard } from "@/components/shared/featured-project-card";
import { ProjectCard } from "@/components/shared/project-card";
import type { Project } from "@/lib/types";

type BentoGridProps = {
  projects: Project[];
  highlightedIds: string[];
};

export function BentoGrid({ projects, highlightedIds }: BentoGridProps) {
  const featuredProjects = projects.filter((project) => project.featured);
  const supportingProjects = projects.filter((project) => !project.featured);
  const highlightSet = new Set(highlightedIds);
  const hasHighlights = highlightSet.size > 0;
  const shouldReduceMotion = useReducedMotion();

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
          {hasHighlights ? (
            <p className="sr-only" aria-live="polite">
              Filter active: matching roles use a warm border and left accent; other roles are
              de-emphasized.
            </p>
          ) : null}
        </div>

        <motion.div layout={!shouldReduceMotion} className="grid gap-4 lg:grid-cols-4 lg:gap-5">
          {featuredProjects.map((project, index) => {
            const isInMatchSet = highlightSet.has(project.id);

            return (
              <div key={project.id} className="lg:col-span-2">
                <FeaturedProjectCard
                  project={project}
                  isDimmed={hasHighlights && !isInMatchSet}
                  showMatchEmphasis={hasHighlights && isInMatchSet}
                  index={index}
                />
              </div>
            );
          })}

          {supportingProjects.map((project, index) => {
            const isInMatchSet = highlightSet.has(project.id);
            const spanClass =
              index === 2 ? "lg:col-span-2" : "lg:col-span-1";

            return (
              <div key={project.id} className={spanClass}>
                <ProjectCard
                  project={project}
                  isDimmed={hasHighlights && !isInMatchSet}
                  showMatchEmphasis={hasHighlights && isInMatchSet}
                  index={index + featuredProjects.length}
                />
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
