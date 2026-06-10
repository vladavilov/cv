// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useExploration } from "@/hooks/use-exploration";
import { serializeExplorationState } from "@/lib/exploration";
import type { QueryCompletedEvent } from "@/lib/experience-search-reducer";
import type { Project } from "@/lib/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const STORAGE_KEY = "cv-exploration-v1";

function makeProject(overrides: Partial<Project> & Pick<Project, "id">): Project {
  return {
    title: `Title ${overrides.id}`,
    company: "Acme",
    period: "2024",
    summary: "summary",
    logic: "logic",
    metrics: {},
    stack: [],
    activeSkills: [],
    trace: [],
    responsibilities: [],
    featured: false,
    ...overrides,
  };
}

const projects: Project[] = [
  makeProject({ id: "p-java", activeSkills: ["Java"] }),
  makeProject({ id: "p-ts", activeSkills: ["TypeScript"] }),
];

function queryCompleted(overrides: Partial<QueryCompletedEvent> = {}): QueryCompletedEvent {
  return {
    query: "java work",
    matchedSkills: ["Java"],
    matchedProjectIds: ["p-java"],
    activeFilter: null,
    outcome: "done",
    ...overrides,
  };
}

function renderExploration() {
  return renderHook(() => useExploration({ projects }));
}

beforeEach(() => {
  window.sessionStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Query-completed milestone toasts enter the live region after ~1.5s. */
function flushToastDelay() {
  act(() => {
    vi.advanceTimersByTime(1500);
  });
}

describe("useExploration", () => {
  it("starts at zero progress and dedupes repeated signals", () => {
    const { result } = renderExploration();

    expect(result.current.progress).toBe(0);

    act(() => {
      result.current.onSkillFilterApplied("Java");
      result.current.onSkillFilterApplied("Java");
    });

    // 1/3 skills + 1/2 projects explored → (0 + 1/3 + 1/2) / 3 ≈ 28.
    expect(result.current.progress).toBe(28);
  });

  it("surfaces a milestone toast once and supports manual dismissal", () => {
    const { result } = renderExploration();

    act(() => {
      result.current.onQueryCompleted(queryCompleted());
    });
    // Query milestones are delayed so the stream/grid announcements land first.
    expect(result.current.activeToast).toBeNull();
    flushToastDelay();
    expect(result.current.activeToast?.id).toBe("first_answer");

    act(() => {
      result.current.dismissToast();
    });
    expect(result.current.activeToast).toBeNull();

    // Terminal-event re-fire of the same query must not re-toast.
    act(() => {
      result.current.onQueryCompleted(queryCompleted({ query: "Java  Work" }));
    });
    flushToastDelay();
    expect(result.current.activeToast).toBeNull();
  });

  it("shows filter milestones immediately but delays query milestones", () => {
    const { result } = renderExploration();

    // skill_filtered events do not race other live regions: no delay.
    act(() => {
      result.current.onSkillFilterApplied("Java");
    });
    expect(result.current.activeToast?.id).toBe("first_filter");

    act(() => {
      result.current.dismissToast();
      result.current.onQueryCompleted(queryCompleted());
    });
    expect(result.current.activeToast).toBeNull();
    flushToastDelay();
    expect(result.current.activeToast?.id).toBe("first_answer");
  });

  it("persists to sessionStorage and rehydrates a fresh mount without replaying toasts", () => {
    const first = renderExploration();

    act(() => {
      first.result.current.onQueryCompleted(queryCompleted());
    });
    flushToastDelay();
    expect(first.result.current.activeToast?.id).toBe("first_answer");
    const progressBefore = first.result.current.progress;
    first.unmount();

    // Simulated reload: a fresh hook instance in the same session.
    const second = renderExploration();
    expect(second.result.current.progress).toBe(progressBefore);
    expect(second.result.current.hydrated).toBe(true);
    expect(second.result.current.activeToast).toBeNull();

    // Same query after the reload: deduped, no milestone replay.
    act(() => {
      second.result.current.onQueryCompleted(queryCompleted());
    });
    flushToastDelay();
    expect(second.result.current.activeToast).toBeNull();
  });

  it("merges signals recorded before hydration with the stored session state", () => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      serializeExplorationState({
        queries: ["stored query"],
        skills: ["TypeScript"],
        exploredProjectIds: ["p-ts"],
        milestones: ["first_answer", "first_filter", "half_explored"],
      }),
    );

    const { result } = renderExploration();

    // A deep-link ?skill= signal can arrive before the mount effect; the
    // lazy hydration path must union both sides, and the already-fired
    // first_filter milestone must not re-toast.
    act(() => {
      result.current.onSkillFilterApplied("Java");
    });

    expect(result.current.activeToast).toBeNull();
    // 1/3 queries + 2/3 skills + 2/2 projects → (1/3 + 2/3 + 1) / 3 ≈ 67.
    expect(result.current.progress).toBe(67);
  });

  it("recovers from malformed storage payloads", () => {
    window.sessionStorage.setItem(STORAGE_KEY, "{corrupt");

    const { result } = renderExploration();

    act(() => {
      result.current.onQueryCompleted(queryCompleted());
    });
    flushToastDelay();

    expect(result.current.activeToast?.id).toBe("first_answer");
    expect(result.current.progress).toBeGreaterThan(0);
  });

  it("updates the chip-ranking snapshot only when a query completes", () => {
    const { result } = renderExploration();

    const initialChipState = result.current.chipRankingState;

    act(() => {
      result.current.onSkillFilterApplied("Java");
    });
    // Filter clicks must not reorder the chips.
    expect(result.current.chipRankingState).toBe(initialChipState);

    act(() => {
      result.current.onQueryCompleted(queryCompleted());
    });
    expect(result.current.chipRankingState).not.toBe(initialChipState);
    expect(result.current.chipRankingState.queries).toEqual(["java work"]);
    // The snapshot includes earlier filter signals once it refreshes.
    expect(result.current.chipRankingState.skills).toEqual(["Java"]);
  });
});
