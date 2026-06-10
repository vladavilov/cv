"use client";

import dynamic from "next/dynamic";

import { ActiveFilterChip } from "@/components/shared/active-filter-chip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

          <ActiveFilterChip value={activeFilter} onClear={onClearFilter} />
        </div>

        <div>
          <SkillGraphCanvas
            skillGraph={skillGraph}
            activeFilter={activeFilter}
            hoveredSkill={hoveredSkill}
            onFilterChange={onFilterChange}
            onHoverChange={onHoverChange}
            onClearFilter={onClearFilter}
          />

          {/* Filter changes are announced by the BentoGrid status region
              (single source of truth); duplicating a polite live region here
              caused double announcements on every filter click. The pressed
              toggle state below still conveys the active filter to SR users. */}

          <ToggleGroup
            value={activeFilter ? [activeFilter] : []}
            onValueChange={(groupValue) => {
              const nextFilter = groupValue[0];

              if (nextFilter) {
                onFilterChange(nextFilter);
              } else {
                // Toggling the pressed skill off deselects → clear the filter.
                onClearFilter();
              }
            }}
            className="mt-4"
          >
            {skillGraph.nodes.map((node) => (
              <ToggleGroupItem
                key={node.id}
                value={node.label}
                onFocus={() => onHoverChange(node.id)}
                onBlur={() => onHoverChange(null)}
              >
                {node.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </section>
  );
}
