import { describe, expect, it } from "vitest";

import {
  applyExplorationEvent,
  computeProgress,
  initialExplorationState,
  MILESTONE_COPY,
  mergeExplorationStates,
  NO_SKILL_MATCH_SENTINEL,
  normalizeQueryKey,
  parseExplorationState,
  projectsExploredFromQuery,
  rankPromptSuggestions,
  serializeExplorationState,
  skillMatchesAnyProject,
  type ExplorationEvent,
  type ExplorationQueryCompletedEvent,
  type ExplorationState,
} from "@/lib/exploration";
import { projects as realProjects, skillGraph as realSkillGraph } from "@/lib/portfolio";
import type { Project } from "@/lib/types";

function makeProject(
  overrides: Partial<Project> & Pick<Project, "id">,
): Project {
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

/** 4 projects: Java matches 2, TypeScript 1, Python 1. */
const projects: Project[] = [
  makeProject({ id: "p-java-1", activeSkills: ["Java"] }),
  makeProject({ id: "p-java-2", stack: ["Java"] }),
  makeProject({ id: "p-ts", activeSkills: ["TypeScript"] }),
  makeProject({ id: "p-py", stack: ["Python"] }),
];

function queryEvent(
  overrides: Partial<Omit<ExplorationQueryCompletedEvent, "type">> = {},
): ExplorationEvent {
  return {
    type: "query_completed",
    query: "java work",
    matchedSkills: ["Java"],
    matchedProjectIds: ["p-java-1"],
    activeFilter: null,
    ...overrides,
  };
}

function fold(events: ExplorationEvent[], state = initialExplorationState) {
  return events.reduce(
    (current, event) => applyExplorationEvent(current, event, projects).state,
    state,
  );
}

describe("normalizeQueryKey", () => {
  it("collapses case and whitespace", () => {
    expect(normalizeQueryKey("  Java   WORK ")).toBe("java work");
    expect(normalizeQueryKey("java work")).toBe("java work");
  });
});

describe("projectsExploredFromQuery", () => {
  it("returns matched ids when no filter is active", () => {
    expect(
      projectsExploredFromQuery(
        { type: "query_completed", query: "q", matchedSkills: [], matchedProjectIds: ["p-ts"], activeFilter: null },
        projects,
      ),
    ).toEqual(["p-ts"]);
  });

  it("merges query matches with projects matching the active filter (combined highlight case)", () => {
    const explored = projectsExploredFromQuery(
      {
        type: "query_completed",
        query: "typescript work",
        matchedSkills: ["TypeScript"],
        matchedProjectIds: ["p-ts"],
        activeFilter: "Java",
      },
      projects,
    );

    // The ?skill=Java override expands the explored set beyond the query match.
    expect(explored.sort()).toEqual(["p-java-1", "p-java-2", "p-ts"]);
  });

  it("excludes the no-skill-match sentinel", () => {
    const explored = projectsExploredFromQuery(
      {
        type: "query_completed",
        query: "q",
        matchedSkills: [],
        matchedProjectIds: [NO_SKILL_MATCH_SENTINEL],
        activeFilter: "Unknown Skill",
      },
      projects,
    );

    expect(explored).toEqual([]);
  });
});

describe("applyExplorationEvent folding", () => {
  it("dedupes queries by normalized key (reloads and back/forward change nothing)", () => {
    const once = fold([queryEvent()]);
    const twice = applyExplorationEvent(once, queryEvent({ query: " JAVA   work " }), projects);

    expect(once.queries).toEqual(["java work"]);
    // Same reference: callers can skip persistence on duplicate signals.
    expect(twice.state).toBe(once);
    expect(twice.newMilestones).toEqual([]);
  });

  it("marks projects matching a filtered skill as explored", () => {
    const state = fold([{ type: "skill_filtered", skill: "Java" }]);

    expect(state.skills).toEqual(["Java"]);
    expect(state.exploredProjectIds.sort()).toEqual(["p-java-1", "p-java-2"]);
  });

  it("records dead-end skills without marking any project explored", () => {
    const state = fold([{ type: "skill_filtered", skill: "No Such Skill" }]);

    expect(state.skills).toEqual(["No Such Skill"]);
    expect(state.exploredProjectIds).toEqual([]);
  });
});

describe("computeProgress", () => {
  it("is 0 for the empty state and 100 only when every sub-score is complete", () => {
    expect(computeProgress(initialExplorationState, projects)).toBe(0);

    const full: ExplorationState = {
      queries: ["a", "b", "c"],
      skills: ["Java", "TypeScript", "Python"],
      exploredProjectIds: projects.map((project) => project.id),
      milestones: [],
    };

    expect(computeProgress(full, projects)).toBe(100);
  });

  it("never reports 100 from rounding while a sub-score is incomplete", () => {
    // 200 projects, 199 explored: mean = (1 + 1 + 0.995) / 3 ≈ 0.998 which
    // would round to 100 — the cap keeps it at 99.
    const manyProjects = Array.from({ length: 200 }, (_, index) =>
      makeProject({ id: `mp-${index}`, activeSkills: ["Java", "TypeScript", "Python"] }),
    );
    const nearlyDone: ExplorationState = {
      queries: ["a", "b", "c"],
      skills: ["Java", "TypeScript", "Python"],
      exploredProjectIds: manyProjects.slice(0, 199).map((project) => project.id),
      milestones: [],
    };

    expect(computeProgress(nearlyDone, manyProjects)).toBe(99);
  });

  it("caps queries and skills at their targets", () => {
    const state: ExplorationState = {
      queries: ["a", "b", "c", "d", "e"],
      skills: ["Java", "TypeScript", "Python"],
      exploredProjectIds: [],
      milestones: [],
    };

    // queries capped at 1, skills 1, projects 0 → 2/3 → 67.
    expect(computeProgress(state, projects)).toBe(67);
  });

  it("ignores unknown project ids from corrupt or stale snapshots", () => {
    const state: ExplorationState = {
      queries: [],
      skills: [],
      exploredProjectIds: ["ghost-1", "ghost-2"],
      milestones: [],
    };

    expect(computeProgress(state, projects)).toBe(0);
  });

  it("does not advance the skill sub-score for dead-end labels", () => {
    const deadEnd: ExplorationState = {
      queries: [],
      skills: ["Dead End A", "Dead End B", "Dead End C"],
      exploredProjectIds: [],
      milestones: [],
    };
    const effective: ExplorationState = { ...deadEnd, skills: ["Java"] };

    expect(computeProgress(deadEnd, projects)).toBe(0);
    expect(computeProgress(effective, projects)).toBeGreaterThan(0);
  });

  it("pins the dead-end labels in the real data: React and Next.js match zero projects", () => {
    const labels = realSkillGraph.nodes.map((node) => node.label);
    const deadEndLabels = labels.filter(
      (label) => !skillMatchesAnyProject(label, realProjects),
    );

    // If data/ changes, this pin must be revisited together with ADR-009.
    expect(deadEndLabels.sort()).toEqual(["Next.js", "React"]);

    const state: ExplorationState = {
      queries: [],
      skills: ["React", "Next.js"],
      exploredProjectIds: [],
      milestones: [],
    };
    expect(computeProgress(state, realProjects)).toBe(0);
  });
});

describe("milestones", () => {
  it("fires first_answer on the first completed query only", () => {
    const first = applyExplorationEvent(initialExplorationState, queryEvent(), projects);
    expect(first.newMilestones.map(({ id }) => id)).toContain("first_answer");

    const second = applyExplorationEvent(
      first.state,
      queryEvent({ query: "another query", matchedProjectIds: [] }),
      projects,
    );
    expect(second.newMilestones.map(({ id }) => id)).not.toContain("first_answer");
  });

  it("fires first_filter for effective skills only, exactly once", () => {
    const deadEnd = applyExplorationEvent(
      initialExplorationState,
      { type: "skill_filtered", skill: "No Such Skill" },
      projects,
    );
    expect(deadEnd.newMilestones).toEqual([]);

    const effective = applyExplorationEvent(
      deadEnd.state,
      { type: "skill_filtered", skill: "Java" },
      projects,
    );
    expect(effective.newMilestones.map(({ id }) => id)).toContain("first_filter");

    const again = applyExplorationEvent(
      effective.state,
      { type: "skill_filtered", skill: "TypeScript" },
      projects,
    );
    expect(again.newMilestones.map(({ id }) => id)).not.toContain("first_filter");
  });

  it("fires half_explored and fully_explored once at their thresholds", () => {
    let state = initialExplorationState;
    const fired: string[] = [];

    const events: ExplorationEvent[] = [
      queryEvent({ query: "one", matchedProjectIds: ["p-java-1"] }),
      queryEvent({ query: "two", matchedProjectIds: ["p-java-2"] }),
      queryEvent({ query: "three", matchedProjectIds: ["p-ts"] }),
      { type: "skill_filtered", skill: "Java" },
      { type: "skill_filtered", skill: "TypeScript" },
      { type: "skill_filtered", skill: "Python" },
      queryEvent({ query: "four", matchedProjectIds: ["p-py"] }),
    ];

    for (const event of events) {
      const update = applyExplorationEvent(state, event, projects);
      state = update.state;
      fired.push(...update.newMilestones.map(({ id }) => id));
    }

    expect(computeProgress(state, projects)).toBe(100);
    expect(fired.filter((id) => id === "half_explored")).toHaveLength(1);
    expect(fired.filter((id) => id === "fully_explored")).toHaveLength(1);
    expect(state.milestones).toContain("fully_explored");
  });

  it("keeps milestone copy quiet: one line, no exclamations, no achievement vocabulary", () => {
    for (const message of Object.values(MILESTONE_COPY)) {
      expect(message).not.toMatch(/!/);
      expect(message).not.toMatch(/achievement|unlocked|level/i);
      expect(message).not.toMatch(/\n/);
    }
  });
});

describe("serialization round-trip", () => {
  it("round-trips a populated state", () => {
    const state = fold([
      queryEvent(),
      { type: "skill_filtered", skill: "TypeScript" },
    ]);

    expect(parseExplorationState(serializeExplorationState(state))).toEqual(state);
  });

  it("falls back to null on corrupt or unversioned input", () => {
    expect(parseExplorationState(null)).toBeNull();
    expect(parseExplorationState("")).toBeNull();
    expect(parseExplorationState("not json {")).toBeNull();
    expect(parseExplorationState('"a string"')).toBeNull();
    expect(parseExplorationState(JSON.stringify({ queries: [] }))).toBeNull();
    expect(
      parseExplorationState(
        JSON.stringify({
          version: 999,
          queries: [],
          skills: [],
          exploredProjectIds: [],
          milestones: [],
        }),
      ),
    ).toBeNull();
    expect(
      parseExplorationState(
        JSON.stringify({
          version: 1,
          queries: [1, 2],
          skills: [],
          exploredProjectIds: [],
          milestones: [],
        }),
      ),
    ).toBeNull();
  });

  it("drops unknown milestone ids so they can fire again legitimately", () => {
    const parsed = parseExplorationState(
      JSON.stringify({
        version: 1,
        queries: ["q"],
        skills: [],
        exploredProjectIds: [],
        milestones: ["first_answer", "made_up_milestone"],
      }),
    );

    expect(parsed?.milestones).toEqual(["first_answer"]);
  });
});

describe("mergeExplorationStates", () => {
  it("unions all signals including fired milestones", () => {
    const live = fold([{ type: "skill_filtered", skill: "Java" }]);
    const stored: ExplorationState = {
      queries: ["java work"],
      skills: ["TypeScript"],
      exploredProjectIds: ["p-ts"],
      milestones: ["first_answer", "first_filter"],
    };

    const merged = mergeExplorationStates(live, stored);

    expect(merged.queries).toEqual(["java work"]);
    expect(merged.skills.sort()).toEqual(["Java", "TypeScript"]);
    expect(merged.exploredProjectIds.sort()).toEqual(["p-java-1", "p-java-2", "p-ts"]);
    expect(merged.milestones.sort()).toEqual(["first_answer", "first_filter"]);
  });
});

describe("rankPromptSuggestions", () => {
  const suggestions = [
    { label: "Java", query: "Show me java work" },
    { label: "TypeScript", query: "Show me typescript work" },
    { label: "Python", query: "Show me python work" },
  ];
  const suggestionProjectIds = new Map([
    ["Show me java work", ["p-java-1", "p-java-2"]],
    ["Show me typescript work", ["p-ts"]],
    ["Show me python work", ["p-py"]],
  ]);

  it("keeps input order before any exploration", () => {
    expect(
      rankPromptSuggestions(suggestions, initialExplorationState, suggestionProjectIds),
    ).toEqual(suggestions);
  });

  it("moves already-run queries back and fully-explored content behind fresh content", () => {
    const state: ExplorationState = {
      queries: [normalizeQueryKey("Show me java work")],
      skills: [],
      exploredProjectIds: ["p-ts"],
      milestones: [],
    };

    const ranked = rankPromptSuggestions(suggestions, state, suggestionProjectIds);

    // Python still has unexplored projects → first; TypeScript's content is
    // fully explored → middle; Java's query was already run → last.
    expect(ranked.map(({ label }) => label)).toEqual(["Python", "TypeScript", "Java"]);
  });
});
