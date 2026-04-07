"use client";

import dynamic from "next/dynamic";

import { ActiveFilterChip } from "@/components/shared/active-filter-chip";
import type { SkillGraph } from "@/lib/types";

const SkillGraphCanvas = dynamic(
  () =>
    import("@/components/shared/skill-graph-canvas").then(
      (module) => module.SkillGraphCanvas,
    ),
  { ssr: false },
);

type InteractiveSkillWebProps = {
  skillGraph: SkillGraph;
  activeFilter: string | null;
  hoveredSkill: string | null;
  onFilterChange: (skill: string) => void;
  onHoverChange: (skill: string | null) => void;
  onClearFilter: () => void;
};

export function InteractiveSkillWeb({
  skillGraph,
  activeFilter,
  hoveredSkill,
  onFilterChange,
  onHoverChange,
  onClearFilter,
}: InteractiveSkillWebProps) {
  return (
    <section id="skills" aria-labelledby="skills-heading" className="section-shell">
      <div className="page-shell space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="section-kicker">Skill Web</p>
            <h2 id="skills-heading" className="section-heading">
              Explore the skill map to filter projects.
            </h2>
            <p className="section-copy">
              Click a node or button to filter the project grid above.
            </p>
          </div>

          {activeFilter ? (
            <ActiveFilterChip value={activeFilter} onClear={onClearFilter} />
          ) : null}
        </div>

        <div>
          <SkillGraphCanvas
            skillGraph={skillGraph}
            activeFilter={activeFilter}
            hoveredSkill={hoveredSkill}
            onFilterChange={onFilterChange}
            onHoverChange={onHoverChange}
          />

          <div aria-live="polite" className="sr-only">
            {activeFilter
              ? `Filtering projects by ${activeFilter}.`
              : "Showing all projects."}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {skillGraph.nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                className={
                  node.label === activeFilter
                    ? "rounded-lg border border-[#c96442]/30 bg-[#c96442]/10 px-3 py-1.5 text-sm text-[#d97757] transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 hover:bg-[#c96442]/14"
                    : "rounded-lg border border-[#30302e] bg-[#30302e] px-3 py-1.5 text-sm text-[#b0aea5] transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 hover:bg-[#3d3d3a] hover:text-foreground"
                }
                onClick={() => onFilterChange(node.label)}
                onFocus={() => onHoverChange(node.id)}
                onBlur={() => onHoverChange(null)}
                aria-pressed={node.label === activeFilter}
              >
                {node.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
