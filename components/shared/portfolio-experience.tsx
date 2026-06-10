"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AgenticHero } from "@/components/shared/agentic-hero";
import { BentoGrid } from "@/components/shared/bento-grid";
import { CommandPalette } from "@/components/shared/command-palette";
import { ContactCta } from "@/components/shared/contact-cta";
import { DiscoveryToast } from "@/components/shared/discovery-toast";
import { InteractiveSkillWeb } from "@/components/shared/interactive-skill-web";
import { ProofLinksPanel } from "@/components/shared/proof-links-panel";
import { ResponsePanel } from "@/components/shared/response-panel";
import { SearchParamsSync } from "@/components/shared/search-params-sync";
import { SectionReveal } from "@/components/shared/section-reveal";
import { StatusHeader } from "@/components/shared/status-header";
import {
  useExperienceSearch,
  type ExperienceSearchCallbacks,
} from "@/hooks/use-experience-search";
import { useExploration } from "@/hooks/use-exploration";
import { rankPromptSuggestions } from "@/lib/exploration";
import {
  getPromptSuggestions,
  matchProjects,
  projectMatchesSkillLabel,
} from "@/lib/query-matching";
import type {
  ContactCtaContent,
  Project,
  ProofLink,
  SkillGraph,
} from "@/lib/types";

type PortfolioExperienceProps = {
  projects: Project[];
  skillGraph: SkillGraph;
  proofLinks: ProofLink[];
  contactCta: ContactCtaContent;
};

export function PortfolioExperience({
  projects,
  skillGraph,
  proofLinks,
  contactCta,
}: PortfolioExperienceProps) {
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Palette close always restores focus here (AR7): when the palette opens
  // via ⌘K over the response drawer, the previously focused element lives in
  // the unmounted drawer and Base UI's default restore would hit <body>.
  const paletteTriggerRef = useRef<HTMLButtonElement>(null);

  const exploration = useExploration({ projects });

  // onQueryCompleted is a pipeline TERMINAL event (re-fires on reloads,
  // back/forward, identical resubmits); the exploration module dedupes by
  // normalized query key, so wiring it directly is safe (ADR-008/009).
  const searchCallbacks = useMemo<ExperienceSearchCallbacks>(
    () => ({
      onQueryCompleted: exploration.onQueryCompleted,
      onSkillFilterApplied: exploration.onSkillFilterApplied,
      onSkillFilterCleared: exploration.onSkillFilterCleared,
    }),
    [
      exploration.onQueryCompleted,
      exploration.onSkillFilterApplied,
      exploration.onSkillFilterCleared,
    ],
  );

  const search = useExperienceSearch({ projects, callbacks: searchCallbacks });
  const { panelOpen, closePanel, submit, setFilter } = search;

  const suggestions = useMemo(() => getPromptSuggestions(), []);

  // Each suggestion's reachable projects, computed with the SAME matcher its
  // query runs through on submit (read-only use of matchProjects token
  // scoring) — a skill-label shortcut can misclassify a suggestion as fully
  // explored when its real query would surface more. matchProjects returns
  // only real project ids (the no-match grid sentinel is added later by the
  // highlight merge in use-experience-search), and projects are static, so
  // this computes once.
  const suggestionProjectIds = useMemo(
    () =>
      new Map(
        suggestions.map((suggestion) => [
          suggestion.query,
          matchProjects(suggestion.query, projects).matchedProjectIds,
        ]),
      ),
    [projects, suggestions],
  );

  // Adaptive prompt chips: ranked against the FROZEN exploration snapshot
  // (updates only when a query completes), so the row never reorders
  // mid-typing or on filter clicks.
  const chips = useMemo(
    () =>
      rankPromptSuggestions(
        suggestions,
        exploration.chipRankingState,
        suggestionProjectIds,
      ).slice(0, 5),
    [suggestions, suggestionProjectIds, exploration.chipRankingState],
  );

  // Palette lists filterable skills only — dead-end graph labels that match
  // zero projects (e.g. "React") would be no-op commands.
  const paletteSkills = useMemo(
    () =>
      skillGraph.nodes
        .map((node) => node.label)
        .filter((label) =>
          projects.some((project) => projectMatchesSkillLabel(project, label)),
        ),
    [projects, skillGraph.nodes],
  );

  // MUTEX (palette ↔ response drawer): opening the palette closes the
  // drawer; anything that opens the drawer (a search pipeline starting,
  // incl. URL-driven runs) closes the palette via the effect below.
  const handlePaletteOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        closePanel();
      }
      setPaletteOpen(nextOpen);
    },
    [closePanel],
  );

  useEffect(() => {
    if (panelOpen) {
      setPaletteOpen(false);
    }
  }, [panelOpen]);

  const openPalette = useCallback(
    () => handlePaletteOpenChange(true),
    [handlePaletteOpenChange],
  );

  const handlePaletteAsk = useCallback(
    (query: string) => {
      setPaletteOpen(false);
      submit(query);
    },
    [submit],
  );

  const handlePaletteSkillSelect = useCallback(
    (skill: string) => {
      setPaletteOpen(false);
      setFilter(skill);
    },
    [setFilter],
  );

  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      {/* useSearchParams needs its own Suspense boundary so the static page
          content keeps prerendering (see ADR-008). */}
      <Suspense fallback={null}>
        <SearchParamsSync onParamsChange={search.syncFromUrl} />
      </Suspense>
      <StatusHeader
        progress={exploration.progress}
        progressHydrated={exploration.hydrated}
        paletteTriggerRef={paletteTriggerRef}
        onOpenPalette={openPalette}
      />
      <main id="main-content" tabIndex={-1}>
        <AgenticHero
          query={search.inputValue}
          isStreaming={search.isBusy}
          chips={chips}
          chipsHydrated={exploration.hydrated}
          onQueryChange={search.setInputValue}
          onSubmit={() => search.submit(search.inputValue)}
          onChipSelect={search.submit}
        />
        <BentoGrid
          projects={search.orderedProjects}
          highlightedIds={search.highlightedIds}
        />
        {/* Cards and proof/contact blocks animate themselves; the skill web
            is the one section without its own entrance. */}
        <SectionReveal>
          <InteractiveSkillWeb
            skillGraph={skillGraph}
            activeFilter={search.activeFilter}
            hoveredSkill={hoveredSkill}
            onFilterChange={search.setFilter}
            onHoverChange={setHoveredSkill}
            onClearFilter={search.clearFilter}
          />
        </SectionReveal>
        <ProofLinksPanel proofLinks={proofLinks} />
      </main>
      {/* Outside <main> so the <footer> maps to the contentinfo landmark
          (a footer nested in main is not exposed as a landmark to AT). */}
      <ContactCta content={contactCta} />

      <ResponsePanel
        open={search.panelOpen}
        response={search.response}
        phase={search.phase}
        isStreaming={search.isBusy}
        steps={search.traceSteps}
        onClose={search.closePanel}
      />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={handlePaletteOpenChange}
        askOptions={suggestions}
        skillOptions={paletteSkills}
        isBusy={search.isBusy}
        finalFocus={paletteTriggerRef}
        onAsk={handlePaletteAsk}
        onFilterSkill={handlePaletteSkillSelect}
      />

      <DiscoveryToast
        toast={exploration.activeToast}
        onDismiss={exploration.dismissToast}
      />
    </>
  );
}
