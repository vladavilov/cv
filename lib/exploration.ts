import { projectMatchesSkillLabel } from "@/lib/query-matching";
import type { Project } from "@/lib/types";

/**
 * Pure exploration-state model for the gamification layer (ADR-009).
 * No browser APIs here — sessionStorage persistence and React wiring live in
 * `hooks/use-exploration.ts`. Everything is deterministic and unit-tested.
 *
 * Exploration signals:
 * - `query_completed` — a search pipeline reached a terminal phase. This is
 *   a TERMINAL event, not a unique-exploration event (re-fires on reloads,
 *   back/forward, identical resubmits — see ADR-008), so queries are deduped
 *   by a normalized key.
 * - `skill_filtered` — a skill filter was applied (user click AND ?skill=
 *   URL sync both count).
 *
 * Project exploration is DERIVED, never reported directly: a project counts
 * as explored when it would be highlighted in the grid, mirroring the
 * highlight merge in `hooks/use-experience-search.ts` (matched ids ∪
 * projects matching the active filter, sentinel excluded).
 */

/** Mirrors the grid sentinel in `hooks/use-experience-search.ts`; never a real project. */
export const NO_SKILL_MATCH_SENTINEL = "__portfolio_no_skill_match__";

/** Unique queries that count as "full" query exploration. */
export const QUERY_TARGET = 3;

/** Distinct effective skill filters that count as "full" skill exploration. */
export const SKILL_TARGET = 3;

export type ExplorationQueryCompletedEvent = {
  type: "query_completed";
  query: string;
  matchedSkills: string[];
  matchedProjectIds: string[];
  /** Filter active when the answer completed (query-derived or ?skill= override). */
  activeFilter: string | null;
};

export type ExplorationSkillFilteredEvent = {
  type: "skill_filtered";
  skill: string;
};

export type ExplorationEvent =
  | ExplorationQueryCompletedEvent
  | ExplorationSkillFilteredEvent;

export type ExplorationMilestoneId =
  | "first_answer"
  | "first_filter"
  | "half_explored"
  | "fully_explored";

export type ExplorationMilestone = {
  id: ExplorationMilestoneId;
  message: string;
};

/** Quiet, one-line copy. No exclamation marks, no achievement vocabulary. */
export const MILESTONE_COPY: Record<ExplorationMilestoneId, string> = {
  first_answer: "First answer streamed. The grid reranks as you ask.",
  first_filter: "First filter applied. The grid follows the skill web.",
  half_explored: "Halfway through the portfolio.",
  fully_explored: "Every project explored. Thanks for the attention to detail.",
};

export type ExplorationState = {
  /** Distinct normalized query keys (see `normalizeQueryKey`). */
  queries: string[];
  /** Distinct skill labels filtered (effective and dead-end alike). */
  skills: string[];
  /** Distinct explored project ids, derived from the highlight rule. */
  exploredProjectIds: string[];
  /** Milestones that already fired this session; each fires exactly once. */
  milestones: ExplorationMilestoneId[];
};

export const initialExplorationState: ExplorationState = {
  queries: [],
  skills: [],
  exploredProjectIds: [],
  milestones: [],
};

/** Case/whitespace-insensitive key so "React work" === " react  WORK ". */
export function normalizeQueryKey(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Projects a completed query explored: mirrors the grid highlight merge —
 * matched project ids ∪ projects matching the active filter — excluding the
 * no-match sentinel, which is a UI flag rather than a real project.
 */
export function projectsExploredFromQuery(
  event: ExplorationQueryCompletedEvent,
  allProjects: Project[],
): string[] {
  const ids = new Set(
    event.matchedProjectIds.filter((id) => id !== NO_SKILL_MATCH_SENTINEL),
  );

  if (event.activeFilter) {
    for (const project of allProjects) {
      if (projectMatchesSkillLabel(project, event.activeFilter)) {
        ids.add(project.id);
      }
    }
  }

  return Array.from(ids);
}

/** A skill is effective when it matches at least one real project. */
export function skillMatchesAnyProject(skill: string, allProjects: Project[]): boolean {
  return allProjects.some((project) => projectMatchesSkillLabel(project, skill));
}

function countEffectiveSkills(skills: string[], allProjects: Project[]): number {
  return skills.filter((skill) => skillMatchesAnyProject(skill, allProjects)).length;
}

/**
 * Exploration progress as an integer 0–100: the mean of three capped
 * sub-scores — queries (target 3), EFFECTIVE skill filters (target 3; labels
 * matching zero projects, e.g. dead-end graph nodes like "React", never
 * advance progress), and explored projects over all projects. Rounded, but
 * pinned to ≤99 until every sub-score is complete so 100 always means
 * "fully explored" rather than a rounding artifact.
 */
export function computeProgress(state: ExplorationState, allProjects: Project[]): number {
  const knownIds = new Set(allProjects.map((project) => project.id));
  const exploredCount = state.exploredProjectIds.filter((id) => knownIds.has(id)).length;

  const subScores = [
    Math.min(state.queries.length / QUERY_TARGET, 1),
    Math.min(countEffectiveSkills(state.skills, allProjects) / SKILL_TARGET, 1),
    allProjects.length > 0 ? Math.min(exploredCount / allProjects.length, 1) : 1,
  ];

  const mean = subScores.reduce((sum, score) => sum + score, 0) / subScores.length;
  const rounded = Math.round(mean * 100);

  return subScores.every((score) => score >= 1) ? 100 : Math.min(rounded, 99);
}

export type ExplorationUpdate = {
  state: ExplorationState;
  /** Milestones newly crossed by this event; already recorded in `state`. */
  newMilestones: ExplorationMilestone[];
};

function addDistinct(values: string[], additions: string[]): string[] {
  const seen = new Set(values);
  const added = additions.filter((value) => {
    if (!value || seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });

  return added.length > 0 ? [...values, ...added] : values;
}

const MILESTONE_CHECKS: Array<{
  id: ExplorationMilestoneId;
  isMet: (state: ExplorationState, allProjects: Project[]) => boolean;
}> = [
  { id: "first_answer", isMet: (state) => state.queries.length >= 1 },
  {
    id: "first_filter",
    isMet: (state, allProjects) => countEffectiveSkills(state.skills, allProjects) >= 1,
  },
  {
    id: "half_explored",
    isMet: (state, allProjects) => computeProgress(state, allProjects) >= 50,
  },
  {
    id: "fully_explored",
    isMet: (state, allProjects) => computeProgress(state, allProjects) === 100,
  },
];

/**
 * Folds one exploration event into the state. Dedupes against existing
 * signals (reloads and back/forward re-runs change nothing) and fires every
 * newly-met milestone exactly once per session — fired ids are recorded in
 * `state.milestones`, so a restored session can never re-fire them. Returns
 * the SAME state reference when the event changes nothing, letting callers
 * skip persistence and re-renders cheaply.
 */
export function applyExplorationEvent(
  state: ExplorationState,
  event: ExplorationEvent,
  allProjects: Project[],
): ExplorationUpdate {
  let next = state;

  switch (event.type) {
    case "query_completed": {
      const key = normalizeQueryKey(event.query);
      const queries = key ? addDistinct(next.queries, [key]) : next.queries;
      const exploredProjectIds = addDistinct(
        next.exploredProjectIds,
        projectsExploredFromQuery(event, allProjects),
      );

      if (queries !== next.queries || exploredProjectIds !== next.exploredProjectIds) {
        next = { ...next, queries, exploredProjectIds };
      }
      break;
    }

    case "skill_filtered": {
      const skills = addDistinct(next.skills, [event.skill]);
      const exploredProjectIds = addDistinct(
        next.exploredProjectIds,
        allProjects
          .filter((project) => projectMatchesSkillLabel(project, event.skill))
          .map((project) => project.id),
      );

      if (skills !== next.skills || exploredProjectIds !== next.exploredProjectIds) {
        next = { ...next, skills, exploredProjectIds };
      }
      break;
    }
  }

  if (next === state) {
    return { state, newMilestones: [] };
  }

  const newMilestones = MILESTONE_CHECKS.filter(
    (milestone) =>
      !next.milestones.includes(milestone.id) && milestone.isMet(next, allProjects),
  ).map(({ id }) => ({ id, message: MILESTONE_COPY[id] }));

  if (newMilestones.length > 0) {
    next = {
      ...next,
      milestones: [...next.milestones, ...newMilestones.map(({ id }) => id)],
    };
  }

  return { state: next, newMilestones };
}

/**
 * Union of two states; used when sessionStorage hydration races a live
 * event (a ?skill= deep link can record before the mount effect runs).
 * Milestone ids are unioned too, so restored milestones stay fired.
 */
export function mergeExplorationStates(
  base: ExplorationState,
  incoming: ExplorationState,
): ExplorationState {
  return {
    queries: addDistinct(base.queries, incoming.queries),
    skills: addDistinct(base.skills, incoming.skills),
    exploredProjectIds: addDistinct(base.exploredProjectIds, incoming.exploredProjectIds),
    milestones: addDistinct(base.milestones, incoming.milestones) as ExplorationMilestoneId[],
  };
}

// ---------------------------------------------------------------------------
// Serialization (sessionStorage round-trip; I/O lives in the hook)
// ---------------------------------------------------------------------------

export const EXPLORATION_SNAPSHOT_VERSION = 1;

export function serializeExplorationState(state: ExplorationState): string {
  return JSON.stringify({ version: EXPLORATION_SNAPSHOT_VERSION, ...state });
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

const MILESTONE_IDS: readonly string[] = MILESTONE_CHECKS.map(({ id }) => id);

/**
 * Parses a stored snapshot defensively. Anything malformed — bad JSON,
 * wrong version, wrong shape — yields null so the session simply restarts
 * exploration from the empty state instead of crashing.
 */
export function parseExplorationState(raw: string | null | undefined): ExplorationState | null {
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const candidate = parsed as Record<string, unknown>;

  if (
    candidate.version !== EXPLORATION_SNAPSHOT_VERSION ||
    !isStringArray(candidate.queries) ||
    !isStringArray(candidate.skills) ||
    !isStringArray(candidate.exploredProjectIds) ||
    !isStringArray(candidate.milestones)
  ) {
    return null;
  }

  return {
    queries: [...new Set(candidate.queries)],
    skills: [...new Set(candidate.skills)],
    exploredProjectIds: [...new Set(candidate.exploredProjectIds)],
    milestones: [
      ...new Set(candidate.milestones.filter((id) => MILESTONE_IDS.includes(id))),
    ] as ExplorationMilestoneId[],
  };
}

// ---------------------------------------------------------------------------
// Adaptive prompt-chip ranking (C6)
// ---------------------------------------------------------------------------

export type RankablePromptSuggestion = {
  label: string;
  query: string;
};

/**
 * Deterministic, stable ranking for the hero prompt chips:
 * 1. unused suggestions whose matched content includes unexplored projects,
 * 2. other unused suggestions,
 * 3. suggestions whose normalized query has already been run.
 * Ties preserve input order, so the result is stable for a given
 * (suggestions, state) pair and chip keys (the query) never collide.
 */
export function rankPromptSuggestions<T extends RankablePromptSuggestion>(
  suggestions: T[],
  state: ExplorationState,
  suggestionProjectIds: ReadonlyMap<string, string[]>,
): T[] {
  const usedQueries = new Set(state.queries);
  const explored = new Set(state.exploredProjectIds);

  const score = (suggestion: T): number => {
    if (usedQueries.has(normalizeQueryKey(suggestion.query))) {
      return 2;
    }

    const projectIds = suggestionProjectIds.get(suggestion.query) ?? [];
    return projectIds.some((id) => !explored.has(id)) ? 0 : 1;
  };

  return suggestions
    .map((suggestion, index) => ({ suggestion, index, score: score(suggestion) }))
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map(({ suggestion }) => suggestion);
}
