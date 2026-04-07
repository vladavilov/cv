"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AgenticHero } from "@/components/shared/agentic-hero";
import { BentoGrid } from "@/components/shared/bento-grid";
import { ContactCta } from "@/components/shared/contact-cta";
import { InteractiveSkillWeb } from "@/components/shared/interactive-skill-web";
import { ProofLinksPanel } from "@/components/shared/proof-links-panel";
import { ResponsePanel } from "@/components/shared/response-panel";
import { StatusHeader } from "@/components/shared/status-header";
import type { ThoughtTraceStep } from "@/components/shared/thought-trace";
import {
  getProjectsByMatchedOrder,
  getPromptSuggestions,
  matchProjects,
  sortProjectsForDisplay,
} from "@/lib/query-matching";
import type {
  ContactCtaContent,
  Project,
  ProofLink,
  SkillGraph,
} from "@/lib/types";

const traceLabels = [
  "Analyzing query",
  "Matching skills",
  "Filtering projects",
  "Preparing response",
] as const;

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
  const chips = useMemo(() => getPromptSuggestions().slice(0, 5), []);
  const timeoutsRef = useRef<number[]>([]);
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [matchedProjectIds, setMatchedProjectIds] = useState<string[]>([]);
  const [steps, setSteps] = useState<ThoughtTraceStep[]>(
    traceLabels.map((label) => ({ label, state: "idle" as const })),
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const clearTimers = useCallback(() => {
    timeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
    timeoutsRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const runSearch = useCallback(
    (nextQuery: string) => {
      clearTimers();

      const normalized = nextQuery.trim();

      if (!normalized) {
        setQuery("");
        setMatchedProjectIds([]);
        setActiveFilter(null);
        setResponse("");
        setIsStreaming(false);
        setSteps(traceLabels.map((label) => ({ label, state: "idle" as const })));
        setPanelOpen(false);
        return;
      }

      const result = matchProjects(normalized, projects);
      const nextFilter = result.matchedSkills[0] ?? null;
      const nextRequestId = requestIdRef.current + 1;

      requestIdRef.current = nextRequestId;

      setQuery(nextQuery);
      setMatchedProjectIds(result.matchedProjectIds);
      setActiveFilter(nextFilter);
      setResponse("Scanning portfolio context…");
      setIsStreaming(true);
      setPanelOpen(true);

      traceLabels.forEach((label, index) => {
        const timeout = window.setTimeout(() => {
          setSteps((current) =>
            current.map((step, stepIndex) => ({
              label: step.label,
              state:
                stepIndex < index
                  ? "done"
                  : stepIndex === index
                    ? "active"
                    : "idle",
            })),
          );
        }, index * 180);

        timeoutsRef.current.push(timeout);
      });

      const finishTimeout = window.setTimeout(() => {
        setSteps(traceLabels.map((label) => ({ label, state: "done" as const })));
      }, 840);

      timeoutsRef.current.push(finishTimeout);

      const matchedProjects = getProjectsByMatchedOrder(projects, result.matchedProjectIds);

      void (async () => {
        try {
          const apiResponse = await fetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt: normalized,
              activeFilter: nextFilter,
              matchedSkills: result.matchedSkills,
              projects: matchedProjects,
            }),
          });

          if (!apiResponse.ok || !apiResponse.body) {
            throw new Error("Streaming route unavailable.");
          }

          const reader = apiResponse.body.getReader();
          const decoder = new TextDecoder();
          let streamedText = "";

          while (true) {
            const { done, value } = await reader.read();

            if (requestIdRef.current !== nextRequestId) {
              await reader.cancel();
              return;
            }

            if (done) {
              break;
            }

            streamedText += decoder.decode(value, { stream: true });
            setResponse(streamedText);
          }

          streamedText += decoder.decode();

          if (!streamedText.trim()) {
            setResponse(result.response);
          }
        } catch {
          if (requestIdRef.current === nextRequestId) {
            setResponse(result.response);
          }
        } finally {
          if (requestIdRef.current === nextRequestId) {
            setIsStreaming(false);
            setSteps(traceLabels.map((label) => ({ label, state: "idle" as const })));
          }
        }
      })();
    },
    [clearTimers, projects],
  );

  const highlightedIds = useMemo(() => {
    const ids = new Set(matchedProjectIds);

    if (activeFilter) {
      projects
        .filter((project) => project.activeSkills.includes(activeFilter))
        .forEach((project) => ids.add(project.id));
    }

    return Array.from(ids);
  }, [activeFilter, matchedProjectIds, projects]);

  const orderedProjects = useMemo(() => {
    return sortProjectsForDisplay(projects, matchedProjectIds, activeFilter);
  }, [activeFilter, matchedProjectIds, projects]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-[#c96442] px-4 py-2 text-sm text-[#faf9f5] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <StatusHeader />
      <main id="main-content" tabIndex={-1}>
        <AgenticHero
          query={query}
          isStreaming={isStreaming}
          chips={chips}
          onQueryChange={setQuery}
          onSubmit={() => runSearch(query)}
          onChipSelect={runSearch}
        />
        <BentoGrid projects={orderedProjects} highlightedIds={highlightedIds} />
        <InteractiveSkillWeb
          skillGraph={skillGraph}
          activeFilter={activeFilter}
          hoveredSkill={hoveredSkill}
          onFilterChange={setActiveFilter}
          onHoverChange={setHoveredSkill}
          onClearFilter={() => setActiveFilter(null)}
        />
        <ProofLinksPanel proofLinks={proofLinks} />
        <ContactCta content={contactCta} />
      </main>

      <ResponsePanel
        open={panelOpen}
        response={response}
        isStreaming={isStreaming}
        steps={steps}
        onClose={() => setPanelOpen(false)}
      />
    </>
  );
}
