import {
  getProjectsByMatchedOrder,
  matchProjects,
  type QueryMatchResult,
} from "@/lib/query-matching";
import type { Project } from "@/lib/types";

/**
 * Pure state machine for the portfolio search experience. No side effects —
 * the fetch/stream/URL layer lives in `hooks/use-experience-search.ts` and
 * only dispatches events defined here.
 *
 * Phase flow: idle → matching → streaming → done | fallback
 *
 *   idle ──SUBMIT──▶ matching ──FIRST_BYTE──▶ streaming ──STREAM_DONE──▶ done
 *                        │                        │
 *                        ├──REQUEST_FAILED────────┼──STREAM_EMPTY──▶ fallback
 *                        └────────────────────────┘
 *
 * CLEAR returns any phase to idle. Every request-scoped event carries the
 * `requestId` issued at SUBMIT; events from superseded requests are ignored.
 */

export type SearchPhase = "idle" | "matching" | "streaming" | "done" | "fallback";

/** How the in-flight request degraded, used for honest trace rendering. */
type SearchFailure = "none" | "empty" | "failed";

export type ExperienceSearchState = {
  phase: SearchPhase;
  /** Monotonic id of the latest accepted search; stale async events are ignored. */
  requestId: number;
  query: string;
  matchedSkills: string[];
  matchedProjectIds: string[];
  activeFilter: string | null;
  response: string;
  panelOpen: boolean;
  /** Lifecycle flags consumed by `deriveThoughtTraceSteps`. */
  matchDone: boolean;
  requestSent: boolean;
  sawFirstByte: boolean;
  failure: SearchFailure;
};

export type ExperienceSearchEvent =
  | { type: "SUBMIT"; requestId: number; query: string }
  | {
      type: "MATCHED";
      requestId: number;
      matchedSkills: string[];
      matchedProjectIds: string[];
      activeFilter: string | null;
    }
  | { type: "REQUEST_SENT"; requestId: number }
  | { type: "FIRST_BYTE"; requestId: number }
  | { type: "CHUNK"; requestId: number; text: string }
  | { type: "STREAM_DONE"; requestId: number }
  | { type: "STREAM_EMPTY"; requestId: number; fallback: string }
  | { type: "REQUEST_FAILED"; requestId: number; fallback: string }
  | { type: "FILTER_SET"; skill: string }
  | { type: "FILTER_CLEARED" }
  | { type: "PANEL_CLOSED" }
  | { type: "CLEAR" };

export const initialExperienceSearchState: ExperienceSearchState = {
  phase: "idle",
  requestId: 0,
  query: "",
  matchedSkills: [],
  matchedProjectIds: [],
  activeFilter: null,
  response: "",
  panelOpen: false,
  matchDone: false,
  requestSent: false,
  sawFirstByte: false,
  failure: "none",
};

/**
 * Request-scoped events only apply to the live request. An idle phase means
 * no request is live (CLEAR preserves the request counter), so even events
 * carrying the matching id are rejected after a reset.
 */
function isStale(state: ExperienceSearchState, requestId: number) {
  return requestId !== state.requestId || state.phase === "idle";
}

export function experienceSearchReducer(
  state: ExperienceSearchState,
  event: ExperienceSearchEvent,
): ExperienceSearchState {
  switch (event.type) {
    case "SUBMIT":
      return {
        ...initialExperienceSearchState,
        phase: "matching",
        requestId: event.requestId,
        query: event.query,
        response: "Scanning portfolio context…",
        panelOpen: true,
      };

    case "MATCHED": {
      if (isStale(state, event.requestId)) {
        return state;
      }

      return {
        ...state,
        matchedSkills: event.matchedSkills,
        matchedProjectIds: event.matchedProjectIds,
        activeFilter: event.activeFilter,
        matchDone: true,
      };
    }

    case "REQUEST_SENT": {
      if (isStale(state, event.requestId)) {
        return state;
      }

      return { ...state, requestSent: true };
    }

    case "FIRST_BYTE": {
      if (isStale(state, event.requestId)) {
        return state;
      }

      return { ...state, phase: "streaming", sawFirstByte: true, response: "" };
    }

    case "CHUNK": {
      if (isStale(state, event.requestId)) {
        return state;
      }

      return { ...state, response: state.response + event.text };
    }

    case "STREAM_DONE": {
      if (isStale(state, event.requestId)) {
        return state;
      }

      return { ...state, phase: "done" };
    }

    case "STREAM_EMPTY": {
      if (isStale(state, event.requestId)) {
        return state;
      }

      return { ...state, phase: "fallback", failure: "empty", response: event.fallback };
    }

    case "REQUEST_FAILED": {
      if (isStale(state, event.requestId)) {
        return state;
      }

      return { ...state, phase: "fallback", failure: "failed", response: event.fallback };
    }

    case "FILTER_SET":
      return { ...state, activeFilter: event.skill };

    case "FILTER_CLEARED":
      return { ...state, activeFilter: null };

    case "PANEL_CLOSED":
      return { ...state, panelOpen: false };

    case "CLEAR":
      // Keep the request counter so events from an aborted request can never
      // match a freshly reset state.
      return { ...initialExperienceSearchState, requestId: state.requestId };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Chat request payload
// ---------------------------------------------------------------------------

export type ChatRequestPayload = {
  prompt: string;
  activeFilter: string | null;
  matchedSkills: string[];
  projects: Project[];
};

/**
 * Builds the exact /api/chat payload the pre-refactor client sent: trimmed
 * prompt, first matched skill as the active filter, and ranked projects in
 * matched order. `getChatFallbackFromRequest` consumes this same payload, so
 * the deterministic fallback copy is byte-identical to before.
 */
export function buildChatRequestPayload(
  rawPrompt: string,
  projects: Project[],
): { payload: ChatRequestPayload; matchResult: QueryMatchResult } {
  // Trim here as well as in the pipeline so URL-driven runs (?q=%20foo%20)
  // can never produce a different payload than a submitted query.
  const prompt = rawPrompt.trim();
  const matchResult = matchProjects(prompt, projects);

  return {
    payload: {
      prompt,
      activeFilter: matchResult.matchedSkills[0] ?? null,
      matchedSkills: matchResult.matchedSkills,
      projects: getProjectsByMatchedOrder(projects, matchResult.matchedProjectIds),
    },
    matchResult,
  };
}

// ---------------------------------------------------------------------------
// Thought trace derivation
// ---------------------------------------------------------------------------

export type TraceStepId = "match" | "request" | "stream" | "fallback";

export type TraceStepState = "idle" | "active" | "done" | "skipped";

export type TraceStep = {
  id: TraceStepId;
  label: string;
  state: TraceStepState;
};

const TRACE_LABELS: Record<TraceStepId, string> = {
  match: "Matching projects",
  request: "Sending request",
  stream: "Streaming answer",
  fallback: "Showing prepared answer",
};

function traceStep(id: TraceStepId, state: TraceStepState): TraceStep {
  return { id, label: TRACE_LABELS[id], state };
}

/**
 * Maps reducer state onto the visible trace. Honest on fallback: steps that
 * never completed render as skipped, and a final "prepared answer" step
 * replaces the pretense of a successful stream.
 */
export function deriveThoughtTraceSteps(state: ExperienceSearchState): TraceStep[] {
  switch (state.phase) {
    case "idle":
      return [
        traceStep("match", "idle"),
        traceStep("request", "idle"),
        traceStep("stream", "idle"),
      ];

    case "matching":
      return [
        traceStep("match", state.matchDone ? "done" : "active"),
        traceStep("request", state.requestSent ? "active" : "idle"),
        traceStep("stream", "idle"),
      ];

    case "streaming":
      return [
        traceStep("match", "done"),
        traceStep("request", "done"),
        traceStep("stream", "active"),
      ];

    case "done":
      return [
        traceStep("match", "done"),
        traceStep("request", "done"),
        traceStep("stream", "done"),
      ];

    case "fallback":
      return [
        traceStep("match", state.matchDone ? "done" : "skipped"),
        // An empty stream means the request itself succeeded; a failed
        // request only "succeeded" up to wherever the first byte arrived.
        traceStep(
          "request",
          state.failure === "empty" || state.sawFirstByte ? "done" : "skipped",
        ),
        traceStep("stream", "skipped"),
        traceStep("fallback", "done"),
      ];
  }
}

// ---------------------------------------------------------------------------
// Exploration event contract (consumed by the gamification slice)
// ---------------------------------------------------------------------------

export type ExperienceSearchOutcome = "done" | "fallback";

export type QueryCompletedEvent = {
  query: string;
  matchedSkills: string[];
  matchedProjectIds: string[];
  /**
   * Filter active at completion (query-derived or ?skill= override). The
   * exploration consumer needs it to mirror the grid's highlight merge —
   * matched ids alone undercount what the visitor actually saw highlighted.
   */
  activeFilter: string | null;
  outcome: ExperienceSearchOutcome;
};

export type ExperienceSearchCallbacks = {
  /**
   * PIPELINE TERMINAL EVENT — not a unique-exploration event. Fires every
   * time a search pipeline reaches a terminal phase ("done" or "fallback"),
   * which includes page reloads of a ?q= link, back/forward navigations
   * that re-run the same query (leave and return), and identical resubmits.
   * Consumers tracking exploration progress MUST dedupe, e.g. by a
   * normalized query key. See ADR-008 ("Exploration callback semantics").
   */
  onQueryCompleted?: (event: QueryCompletedEvent) => void;
  /** Fires on every filter application: user clicks and ?skill= URL syncs. */
  onSkillFilterApplied?: (skill: string) => void;
  onSkillFilterCleared?: () => void;
};

/**
 * Returns the `onQueryCompleted` payload when the state sits in a terminal
 * phase, otherwise null. The hook calls this once per phase transition so a
 * single search fires exactly one completion event.
 */
export function queryCompletedEventFromState(
  state: ExperienceSearchState,
): QueryCompletedEvent | null {
  if (state.phase !== "done" && state.phase !== "fallback") {
    return null;
  }

  return {
    query: state.query,
    matchedSkills: state.matchedSkills,
    matchedProjectIds: state.matchedProjectIds,
    activeFilter: state.activeFilter,
    outcome: state.phase,
  };
}
