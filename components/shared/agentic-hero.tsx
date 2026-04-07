"use client";

import { ExperienceSearch } from "@/components/shared/experience-search";
import { PromptChips } from "@/components/shared/prompt-chips";

type PromptChip = {
  label: string;
  query: string;
};

type AgenticHeroProps = {
  query: string;
  isStreaming: boolean;
  chips: PromptChip[];
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onChipSelect: (query: string) => void;
};

export function AgenticHero({
  query,
  isStreaming,
  chips,
  onQueryChange,
  onSubmit,
  onChipSelect,
}: AgenticHeroProps) {
  return (
    <section id="hero" aria-labelledby="hero-heading" className="section-shell pt-10 md:pt-14">
      <div className="page-shell">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1
              id="hero-heading"
              className="font-[family-name:var(--font-heading)] text-4xl font-medium leading-[1.10] text-foreground md:text-[64px]"
            >
              AI Architect
            </h1>
            <p className="text-xl leading-relaxed text-[#5e5d59]">
              Software Engineering Leader with 15+ years in financial markets, trading platforms, and agentic AI systems.
            </p>
          </div>

          <ExperienceSearch
            value={query}
            onChange={onQueryChange}
            onSubmit={onSubmit}
            isStreaming={isStreaming}
          />

          <PromptChips chips={chips} onSelect={onChipSelect} disabled={isStreaming} />
        </div>
      </div>
    </section>
  );
}
