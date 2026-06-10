"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  applyExplorationEvent,
  computeProgress,
  initialExplorationState,
  mergeExplorationStates,
  parseExplorationState,
  serializeExplorationState,
  type ExplorationEvent,
  type ExplorationState,
} from "@/lib/exploration";
import type { QueryCompletedEvent } from "@/lib/experience-search-reducer";
import type { Project } from "@/lib/types";

const STORAGE_KEY = "cv-exploration-v1";

/**
 * Milestones unlocked by a completed query wait this long before entering
 * the toast live region, so the response stream and grid filter-status
 * announcements (which fire at the same terminal moment) land first instead
 * of racing three polite announcements at once.
 */
const QUERY_MILESTONE_TOAST_DELAY_MS = 1500;

export type ExplorationToast = {
  id: string;
  message: string;
};

type UseExplorationOptions = {
  projects: Project[];
};

/**
 * Stateful shell around the pure model in `lib/exploration.ts` (ADR-009).
 *
 * Hydration: the server and the first client render both use the empty
 * state — sessionStorage is only read on the client, lazily, either in the
 * mount effect or just-in-time when the first exploration signal arrives
 * (a ?q=/?skill= deep-link sync runs in a child effect, BEFORE this hook's
 * own mount effect). No hydration mismatch; `/` stays prerendered static.
 *
 * Toasts fire only for milestones newly crossed by live events in this
 * browsing session. Restored milestones are merged into state as already
 * fired, so a reload can never replay their toasts.
 */
export function useExploration({ projects }: UseExplorationOptions) {
  const [state, setState] = useState(initialExplorationState);
  /**
   * Frozen copy used for adaptive chip ranking; updated ONLY when a query
   * completes (and once at hydration), never on filter clicks, so the chip
   * row cannot reorder mid-interaction.
   */
  const [chipRankingState, setChipRankingState] = useState(initialExplorationState);
  const [activeToast, setActiveToast] = useState<ExplorationToast | null>(null);
  /** True once stored progress has been applied; lets the ring suppress its first jump. */
  const [hydrated, setHydrated] = useState(false);

  const stateRef = useRef(state);
  const hydratedRef = useRef(false);
  const toastDelayRef = useRef<number | null>(null);

  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  const ensureHydrated = useCallback(() => {
    if (hydratedRef.current || typeof window === "undefined") {
      return;
    }
    hydratedRef.current = true;

    let stored: ExplorationState | null = null;
    try {
      stored = parseExplorationState(window.sessionStorage.getItem(STORAGE_KEY));
    } catch {
      // Storage unavailable (privacy mode): exploration lives in memory only.
    }

    if (stored) {
      const merged = mergeExplorationStates(stateRef.current, stored);
      stateRef.current = merged;
      setState(merged);
      setChipRankingState(merged);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    ensureHydrated();
  }, [ensureHydrated]);

  const record = useCallback(
    (event: ExplorationEvent) => {
      // Merge stored state first so milestones that fired in an earlier
      // page load can never re-fire from this event.
      ensureHydrated();

      const update = applyExplorationEvent(stateRef.current, event, projectsRef.current);

      if (update.state !== stateRef.current) {
        stateRef.current = update.state;
        setState(update.state);

        try {
          window.sessionStorage.setItem(
            STORAGE_KEY,
            serializeExplorationState(update.state),
          );
        } catch {
          // Best effort; progress simply won't survive a reload.
        }
      }

      // Single toast slot: a newer milestone replaces the visible one (and
      // cancels any still-delayed one). When one event crosses several,
      // show the most significant (last). Query-completion milestones are
      // delayed so the stream/grid live regions announce first.
      const milestone = update.newMilestones.at(-1);
      if (milestone) {
        if (toastDelayRef.current !== null) {
          window.clearTimeout(toastDelayRef.current);
          toastDelayRef.current = null;
        }
        const show = () =>
          setActiveToast({ id: milestone.id, message: milestone.message });
        if (event.type === "query_completed") {
          toastDelayRef.current = window.setTimeout(() => {
            toastDelayRef.current = null;
            show();
          }, QUERY_MILESTONE_TOAST_DELAY_MS);
        } else {
          show();
        }
      }
    },
    [ensureHydrated],
  );

  // Drop a still-delayed toast on unmount.
  useEffect(
    () => () => {
      if (toastDelayRef.current !== null) {
        window.clearTimeout(toastDelayRef.current);
      }
    },
    [],
  );

  /** `ExperienceSearchCallbacks.onQueryCompleted`-compatible recorder. */
  const onQueryCompleted = useCallback(
    (event: QueryCompletedEvent) => {
      record({
        type: "query_completed",
        query: event.query,
        matchedSkills: event.matchedSkills,
        matchedProjectIds: event.matchedProjectIds,
        activeFilter: event.activeFilter,
      });
      // Chips re-rank only at this moment, never mid-typing or on filters.
      setChipRankingState(stateRef.current);
    },
    [record],
  );

  const onSkillFilterApplied = useCallback(
    (skill: string) => {
      record({ type: "skill_filtered", skill });
    },
    [record],
  );

  /** Clearing a filter is not an exploration signal; deliberate no-op. */
  const onSkillFilterCleared = useCallback(() => {}, []);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const progress = useMemo(() => computeProgress(state, projects), [state, projects]);

  return {
    progress,
    hydrated,
    activeToast,
    dismissToast,
    chipRankingState,
    onQueryCompleted,
    onSkillFilterApplied,
    onSkillFilterCleared,
  };
}
