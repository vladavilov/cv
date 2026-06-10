"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import {
  buildChatRequestPayload,
  deriveThoughtTraceSteps,
  experienceSearchReducer,
  initialExperienceSearchState,
  queryCompletedEventFromState,
  type ExperienceSearchCallbacks,
} from "@/lib/experience-search-reducer";
import { getChatFallbackFromRequest } from "@/lib/fallback-responses";
import {
  projectMatchesSkillLabel,
  sortProjectsForDisplay,
} from "@/lib/query-matching";
import type { Project } from "@/lib/types";

export type {
  ExperienceSearchCallbacks,
  ExperienceSearchOutcome,
  QueryCompletedEvent,
  SearchPhase,
} from "@/lib/experience-search-reducer";

/** No real project id; forces the grid into “filter active” mode when no role matches the skill. */
const NO_SKILL_MATCH_ID = "__portfolio_no_skill_match__";

type UseExperienceSearchOptions = {
  projects: Project[];
  /** Exploration listeners; consumed by the gamification slice. */
  callbacks?: ExperienceSearchCallbacks;
};

/**
 * Owns the full search lifecycle: client-side matching, the streaming
 * /api/chat request (with real AbortController cancellation when a new
 * search supersedes it), URL (?q=/?skill=) synchronization, and the
 * exploration event contract. All state transitions go through the pure
 * reducer in `lib/experience-search-reducer.ts`.
 */
export function useExperienceSearch({ projects, callbacks }: UseExperienceSearchOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, dispatch] = useReducer(experienceSearchReducer, initialExperienceSearchState);
  const [inputValue, setInputValue] = useState("");

  const stateRef = useRef(state);
  stateRef.current = state;

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const abortRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);
  /**
   * Last (?q=, ?skill=) pair this hook has either written to the URL or
   * applied from it. Prevents the URL→state effect from re-running a
   * pipeline we just started ourselves (write loop) and from re-running an
   * identical query on back/forward.
   */
  const lastSyncedParamsRef = useRef<{ q: string; skill: string } | null>(null);
  const prevPhaseRef = useRef(state.phase);

  // Fire onQueryCompleted exactly once per terminal phase transition. The
  // payload is derived from reducer state via a pure, unit-tested helper.
  useEffect(() => {
    if (prevPhaseRef.current === state.phase) {
      return;
    }
    prevPhaseRef.current = state.phase;

    const event = queryCompletedEventFromState(state);
    if (event) {
      callbacksRef.current?.onQueryCompleted?.(event);
    }
  }, [state]);

  // Cancel any in-flight stream on unmount — and forget the last-synced URL
  // pair. Under dev StrictMode the mount→cleanup→remount cycle aborts a
  // ?q= deep link's fetch mid-flight while the ref (which survives the
  // simulated remount) still holds that q/skill signature; without clearing
  // it, the remounted SearchParamsSync effect would short-circuit as
  // "already synced" and the pipeline would never restart (permanent
  // matching state in dev). Clearing is free in production, where this
  // cleanup only runs on a real unmount that discards the ref anyway, and
  // it cannot reintroduce the own-push double-fetch: submit/setFilter/clear
  // re-set the ref synchronously, outside any cleanup path.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      lastSyncedParamsRef.current = null;
    };
  }, []);

  const buildUrl = useCallback(
    (q: string, skill: string) => {
      const params = new URLSearchParams();
      if (q) {
        params.set("q", q);
      }
      if (skill) {
        params.set("skill", skill);
      }
      const queryString = params.toString();
      return queryString ? `${pathname}?${queryString}` : pathname;
    },
    [pathname],
  );

  const resetState = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setInputValue("");
    dispatch({ type: "CLEAR" });
  }, []);

  /**
   * Full search pipeline: abort the previous request, rank projects
   * client-side immediately, open the panel, then stream the answer.
   * The query is trimmed here so URL-driven runs (?q=%20foo%20) produce the
   * same payload and fallback copy as a submitted, trimmed query.
   * `filterOverride` (from ?skill=) wins over the query-derived filter for
   * the UI, but the /api/chat payload stays identical to a plain submit so
   * the deterministic fallback copy is unchanged.
   */
  const runPipeline = useCallback(
    (query: string, filterOverride?: string) => {
      const prompt = query.trim();

      if (!prompt) {
        // Whitespace-only ?q= deep link: behave like no query at all.
        resetState();
        if (filterOverride) {
          dispatch({ type: "FILTER_SET", skill: filterOverride });
        }
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestSeqRef.current;

      setInputValue(prompt);
      dispatch({ type: "SUBMIT", requestId, query: prompt });

      const { payload: chatRequestPayload, matchResult } = buildChatRequestPayload(
        prompt,
        projects,
      );

      dispatch({
        type: "MATCHED",
        requestId,
        matchedSkills: matchResult.matchedSkills,
        matchedProjectIds: matchResult.matchedProjectIds,
        activeFilter: chatRequestPayload.activeFilter,
      });

      if (filterOverride) {
        dispatch({ type: "FILTER_SET", skill: filterOverride });
      }

      const fallbackMessage = () => getChatFallbackFromRequest(chatRequestPayload);

      dispatch({ type: "REQUEST_SENT", requestId });

      void (async () => {
        try {
          const apiResponse = await fetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(chatRequestPayload),
            signal: controller.signal,
          });

          if (!apiResponse.ok || !apiResponse.body) {
            throw new Error("Streaming route unavailable.");
          }

          const reader = apiResponse.body.getReader();
          const decoder = new TextDecoder();
          let streamedText = "";
          let sawFirstByte = false;

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            if (!sawFirstByte) {
              sawFirstByte = true;
              dispatch({ type: "FIRST_BYTE", requestId });
            }

            const text = decoder.decode(value, { stream: true });
            if (text) {
              streamedText += text;
              dispatch({ type: "CHUNK", requestId, text });
            }
          }

          const flushed = decoder.decode();
          if (flushed) {
            streamedText += flushed;
            dispatch({ type: "CHUNK", requestId, text: flushed });
          }

          if (streamedText.trim()) {
            dispatch({ type: "STREAM_DONE", requestId });
          } else {
            dispatch({ type: "STREAM_EMPTY", requestId, fallback: fallbackMessage() });
          }
        } catch {
          // Aborted requests were superseded (or unmounted): stay silent.
          if (!controller.signal.aborted) {
            dispatch({ type: "REQUEST_FAILED", requestId, fallback: fallbackMessage() });
          }
        }
      })();
    },
    [projects, resetState],
  );

  /** Clears search + filter and removes both URL params (history push). */
  const clear = useCallback(() => {
    resetState();
    lastSyncedParamsRef.current = { q: "", skill: "" };
    router.push(pathname, { scroll: false });
  }, [pathname, resetState, router]);

  /** Submits a query: pushes ?q=… (history entry) and runs the pipeline. */
  const submit = useCallback(
    (rawQuery: string) => {
      const normalized = rawQuery.trim();

      if (!normalized) {
        clear();
        return;
      }

      lastSyncedParamsRef.current = { q: normalized, skill: "" };
      runPipeline(normalized);
      router.push(buildUrl(normalized, ""), { scroll: false });
    },
    [buildUrl, clear, router, runPipeline],
  );

  /** Applies a skill filter only — no API call, no panel (replace, no history spam). */
  const setFilter = useCallback(
    (skill: string) => {
      dispatch({ type: "FILTER_SET", skill });
      callbacksRef.current?.onSkillFilterApplied?.(skill);

      const q = stateRef.current.query;
      lastSyncedParamsRef.current = { q, skill };
      router.replace(buildUrl(q, skill), { scroll: false });
    },
    [buildUrl, router],
  );

  const clearFilter = useCallback(() => {
    dispatch({ type: "FILTER_CLEARED" });
    callbacksRef.current?.onSkillFilterCleared?.();

    const q = stateRef.current.query;
    lastSyncedParamsRef.current = { q, skill: "" };
    router.replace(buildUrl(q, ""), { scroll: false });
  }, [buildUrl, router]);

  const closePanel = useCallback(() => {
    dispatch({ type: "PANEL_CLOSED" });
  }, []);

  /**
   * URL → state. Called by the SearchParamsSync bridge on initial load and
   * on every back/forward navigation. ?q= runs the full pipeline; ?skill=
   * applies the filter only; with both, q's pipeline runs and ?skill= wins
   * as the active filter override.
   */
  const syncFromUrl = useCallback(
    (q: string, skill: string) => {
      const prev = lastSyncedParamsRef.current;

      if (prev && prev.q === q && prev.skill === skill) {
        return;
      }

      lastSyncedParamsRef.current = { q, skill };

      if (q) {
        if (!prev || prev.q !== q) {
          runPipeline(q, skill || undefined);
          if (skill) {
            callbacksRef.current?.onSkillFilterApplied?.(skill);
          }
          return;
        }

        // Same query, only the skill param changed: adjust the filter
        // without re-running the request.
        if (skill) {
          dispatch({ type: "FILTER_SET", skill });
          callbacksRef.current?.onSkillFilterApplied?.(skill);
          return;
        }

        // Skill param removed (back/forward): restore the match-derived
        // filter so this URL yields the same state as a fresh ?q= load.
        // Restoring it is not a new filter application, so no callback.
        const matchDerivedFilter = stateRef.current.matchedSkills[0] ?? null;
        if (matchDerivedFilter) {
          if (stateRef.current.activeFilter !== matchDerivedFilter) {
            dispatch({ type: "FILTER_SET", skill: matchDerivedFilter });
          }
        } else if (stateRef.current.activeFilter) {
          dispatch({ type: "FILTER_CLEARED" });
          callbacksRef.current?.onSkillFilterCleared?.();
        }
        return;
      }

      if (skill) {
        // Filter-only deep link / navigation: drop any query state first.
        if (stateRef.current.phase !== "idle" || prev?.q) {
          resetState();
        }
        dispatch({ type: "FILTER_SET", skill });
        callbacksRef.current?.onSkillFilterApplied?.(skill);
        return;
      }

      // Both params gone. On initial load with a clean URL there is nothing
      // to do; on back/forward this restores the pristine state.
      if (prev) {
        resetState();
      }
    },
    [resetState, runPipeline],
  );

  const highlightedIds = useMemo(() => {
    const ids = new Set(state.matchedProjectIds);
    const activeFilter = state.activeFilter;

    if (activeFilter) {
      const skillMatches = projects.filter((project) =>
        projectMatchesSkillLabel(project, activeFilter),
      );
      skillMatches.forEach((project) => ids.add(project.id));
      if (skillMatches.length === 0 && state.matchedProjectIds.length === 0) {
        ids.add(NO_SKILL_MATCH_ID);
      }
    }

    return Array.from(ids);
  }, [projects, state.activeFilter, state.matchedProjectIds]);

  const orderedProjects = useMemo(() => {
    return sortProjectsForDisplay(projects, state.matchedProjectIds, state.activeFilter);
  }, [projects, state.activeFilter, state.matchedProjectIds]);

  const traceSteps = useMemo(() => deriveThoughtTraceSteps(state), [state]);

  const isBusy = state.phase === "matching" || state.phase === "streaming";

  return {
    phase: state.phase,
    inputValue,
    setInputValue,
    response: state.response,
    activeFilter: state.activeFilter,
    panelOpen: state.panelOpen,
    isBusy,
    traceSteps,
    highlightedIds,
    orderedProjects,
    submit,
    clear,
    setFilter,
    clearFilter,
    closePanel,
    syncFromUrl,
  };
}
