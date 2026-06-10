import { describe, expect, it } from "vitest";

import {
  buildChatRequestPayload,
  deriveThoughtTraceSteps,
  experienceSearchReducer,
  initialExperienceSearchState,
  queryCompletedEventFromState,
  type ExperienceSearchEvent,
  type ExperienceSearchState,
  type TraceStepId,
  type TraceStepState,
} from "./experience-search-reducer";
import type { Project } from "./types";

function run(
  events: ExperienceSearchEvent[],
  initial: ExperienceSearchState = initialExperienceSearchState,
) {
  return events.reduce(experienceSearchReducer, initial);
}

function traceById(state: ExperienceSearchState) {
  return Object.fromEntries(
    deriveThoughtTraceSteps(state).map((step) => [step.id, step.state]),
  ) as Partial<Record<TraceStepId, TraceStepState>>;
}

const submit: ExperienceSearchEvent = {
  type: "SUBMIT",
  requestId: 1,
  query: "agentic ai",
};

const matched: ExperienceSearchEvent = {
  type: "MATCHED",
  requestId: 1,
  matchedSkills: ["LangGraph"],
  matchedProjectIds: ["proj-a", "proj-b"],
  activeFilter: "LangGraph",
};

const requestSent: ExperienceSearchEvent = { type: "REQUEST_SENT", requestId: 1 };

describe("experienceSearchReducer", () => {
  it("walks the happy path: idle → matching → streaming → done", () => {
    let state = initialExperienceSearchState;
    expect(state.phase).toBe("idle");
    expect(traceById(state)).toEqual({
      match: "idle",
      request: "idle",
      stream: "idle",
    });

    state = experienceSearchReducer(state, submit);
    expect(state.phase).toBe("matching");
    expect(state.query).toBe("agentic ai");
    expect(state.panelOpen).toBe(true);
    expect(state.response).toBe("Scanning portfolio context…");
    expect(traceById(state)).toEqual({
      match: "active",
      request: "idle",
      stream: "idle",
    });

    state = experienceSearchReducer(state, matched);
    expect(state.matchedProjectIds).toEqual(["proj-a", "proj-b"]);
    expect(state.activeFilter).toBe("LangGraph");
    expect(traceById(state).match).toBe("done");

    state = experienceSearchReducer(state, requestSent);
    expect(state.phase).toBe("matching");
    expect(traceById(state)).toEqual({
      match: "done",
      request: "active",
      stream: "idle",
    });

    state = experienceSearchReducer(state, { type: "FIRST_BYTE", requestId: 1 });
    expect(state.phase).toBe("streaming");
    expect(state.response).toBe("");
    expect(traceById(state)).toEqual({
      match: "done",
      request: "done",
      stream: "active",
    });

    state = experienceSearchReducer(state, { type: "CHUNK", requestId: 1, text: "Hello " });
    state = experienceSearchReducer(state, { type: "CHUNK", requestId: 1, text: "world." });
    expect(state.response).toBe("Hello world.");

    state = experienceSearchReducer(state, { type: "STREAM_DONE", requestId: 1 });
    expect(state.phase).toBe("done");
    expect(state.response).toBe("Hello world.");
    expect(state.panelOpen).toBe(true);
    expect(traceById(state)).toEqual({
      match: "done",
      request: "done",
      stream: "done",
    });
  });

  it("STREAM_EMPTY moves to fallback and the trace stays honest", () => {
    const state = run([
      submit,
      matched,
      requestSent,
      { type: "STREAM_EMPTY", requestId: 1, fallback: "Deterministic copy." },
    ]);

    expect(state.phase).toBe("fallback");
    expect(state.response).toBe("Deterministic copy.");
    expect(state.panelOpen).toBe(true);
    // The request succeeded (empty body), the stream never produced an answer,
    // and the prepared-answer step explains what the user is reading.
    expect(traceById(state)).toEqual({
      match: "done",
      request: "done",
      stream: "skipped",
      fallback: "done",
    });
  });

  it("REQUEST_FAILED before the first byte skips the request step", () => {
    const state = run([
      submit,
      matched,
      requestSent,
      { type: "REQUEST_FAILED", requestId: 1, fallback: "Deterministic copy." },
    ]);

    expect(state.phase).toBe("fallback");
    expect(state.response).toBe("Deterministic copy.");
    expect(state.matchedProjectIds).toEqual(["proj-a", "proj-b"]);
    expect(traceById(state)).toEqual({
      match: "done",
      request: "skipped",
      stream: "skipped",
      fallback: "done",
    });
  });

  it("REQUEST_FAILED after the first byte keeps the request step done", () => {
    const state = run([
      submit,
      matched,
      requestSent,
      { type: "FIRST_BYTE", requestId: 1 },
      { type: "REQUEST_FAILED", requestId: 1, fallback: "Deterministic copy." },
    ]);

    expect(traceById(state)).toEqual({
      match: "done",
      request: "done",
      stream: "skipped",
      fallback: "done",
    });
  });

  it("drops stale events from a superseded request", () => {
    const inFlight = run([submit, matched, requestSent]);

    const newSearch = run(
      [
        { type: "SUBMIT", requestId: 2, query: "java" },
        {
          type: "MATCHED",
          requestId: 2,
          matchedSkills: ["Java"],
          matchedProjectIds: ["proj-c"],
          activeFilter: "Java",
        },
        { type: "REQUEST_SENT", requestId: 2 },
      ],
      inFlight,
    );

    const afterStaleEvents = run(
      [
        { type: "FIRST_BYTE", requestId: 1 },
        { type: "CHUNK", requestId: 1, text: "stale text" },
        { type: "STREAM_EMPTY", requestId: 1, fallback: "stale fallback" },
        { type: "REQUEST_FAILED", requestId: 1, fallback: "stale fallback" },
        { type: "STREAM_DONE", requestId: 1 },
      ],
      newSearch,
    );

    expect(afterStaleEvents).toEqual(newSearch);
    expect(afterStaleEvents.phase).toBe("matching");
    expect(afterStaleEvents.response).toBe("Scanning portfolio context…");
    expect(afterStaleEvents.matchedProjectIds).toEqual(["proj-c"]);
  });

  it("CLEAR resets to pristine state while keeping the request counter", () => {
    const midStream = run([
      submit,
      matched,
      requestSent,
      { type: "FIRST_BYTE", requestId: 1 },
      { type: "CHUNK", requestId: 1, text: "partial" },
      { type: "FILTER_SET", skill: "React" },
    ]);

    const cleared = experienceSearchReducer(midStream, { type: "CLEAR" });

    expect(cleared).toEqual({
      ...initialExperienceSearchState,
      requestId: midStream.requestId,
    });
    expect(cleared.phase).toBe("idle");
    expect(cleared.panelOpen).toBe(false);
    expect(cleared.activeFilter).toBeNull();

    // Events from the aborted request can never re-animate a cleared state.
    const afterStale = experienceSearchReducer(cleared, {
      type: "STREAM_DONE",
      requestId: 99,
    });
    expect(afterStale).toEqual(cleared);
  });

  it("filter set/clear overrides the filter without touching matched ids", () => {
    const afterSearch = run([
      submit,
      matched,
      requestSent,
      { type: "FIRST_BYTE", requestId: 1 },
      { type: "CHUNK", requestId: 1, text: "answer" },
      { type: "STREAM_DONE", requestId: 1 },
    ]);
    expect(afterSearch.activeFilter).toBe("LangGraph");

    const withSkill = experienceSearchReducer(afterSearch, {
      type: "FILTER_SET",
      skill: "React",
    });
    expect(withSkill.activeFilter).toBe("React");
    expect(withSkill.matchedProjectIds).toEqual(["proj-a", "proj-b"]);
    expect(withSkill.phase).toBe("done");
    expect(withSkill.response).toBe("answer");

    const clearedFilter = experienceSearchReducer(withSkill, {
      type: "FILTER_CLEARED",
    });
    expect(clearedFilter.activeFilter).toBeNull();
    expect(clearedFilter.matchedProjectIds).toEqual(["proj-a", "proj-b"]);
  });

  it("applies a skill filter from idle without opening the panel", () => {
    const state = experienceSearchReducer(initialExperienceSearchState, {
      type: "FILTER_SET",
      skill: "React",
    });

    expect(state.activeFilter).toBe("React");
    expect(state.phase).toBe("idle");
    expect(state.panelOpen).toBe(false);
  });

  it("PANEL_CLOSED keeps the response and trace intact", () => {
    const afterSearch = run([
      submit,
      matched,
      requestSent,
      { type: "FIRST_BYTE", requestId: 1 },
      { type: "CHUNK", requestId: 1, text: "answer" },
      { type: "STREAM_DONE", requestId: 1 },
    ]);

    const closed = experienceSearchReducer(afterSearch, { type: "PANEL_CLOSED" });

    expect(closed.panelOpen).toBe(false);
    expect(closed.response).toBe("answer");
    expect(traceById(closed).stream).toBe("done");
  });
});

describe("queryCompletedEventFromState", () => {
  it("returns null while the search is in flight", () => {
    expect(queryCompletedEventFromState(initialExperienceSearchState)).toBeNull();
    expect(queryCompletedEventFromState(run([submit]))).toBeNull();
    expect(
      queryCompletedEventFromState(
        run([submit, matched, requestSent, { type: "FIRST_BYTE", requestId: 1 }]),
      ),
    ).toBeNull();
  });

  it("maps a done state to a completion event", () => {
    const state = run([
      submit,
      matched,
      requestSent,
      { type: "FIRST_BYTE", requestId: 1 },
      { type: "STREAM_DONE", requestId: 1 },
    ]);

    expect(queryCompletedEventFromState(state)).toEqual({
      query: "agentic ai",
      matchedSkills: ["LangGraph"],
      matchedProjectIds: ["proj-a", "proj-b"],
      activeFilter: "LangGraph",
      outcome: "done",
    });
  });

  it("maps a fallback state to a fallback outcome", () => {
    const state = run([
      submit,
      matched,
      requestSent,
      { type: "REQUEST_FAILED", requestId: 1, fallback: "copy" },
    ]);

    expect(queryCompletedEventFromState(state)?.outcome).toBe("fallback");
  });
});

describe("buildChatRequestPayload", () => {
  function createProject(id: string, options: Partial<Project> = {}): Project {
    return {
      id,
      title: `Title ${id}`,
      company: "Example Co",
      period: "2024",
      summary: "Example summary",
      logic: "Example logic",
      metrics: {},
      stack: ["TypeScript"],
      activeSkills: ["TypeScript"],
      trace: ["Search"],
      responsibilities: ["Build"],
      featured: false,
      ...options,
    };
  }

  const projects = [
    createProject("plain", { stack: ["Cobol"], activeSkills: [] }),
    createProject("react-ui", {
      summary: "React frontend work",
      stack: ["React", "TypeScript"],
      activeSkills: ["TypeScript"],
    }),
    createProject("ts-platform", {
      summary: "TypeScript platform with React dashboards",
      activeSkills: ["TypeScript"],
    }),
  ];

  it("trims the prompt and derives the payload from the match result", () => {
    const trimmed = buildChatRequestPayload("show me react work", projects);
    // ?q=%20foo%20 must produce the same payload (and thus the same
    // deterministic fallback copy) as a submitted, trimmed query.
    const padded = buildChatRequestPayload("  show me react work  ", projects);

    expect(padded).toEqual(trimmed);

    expect(trimmed.payload.prompt).toBe("show me react work");
    // activeFilter is the first match-derived skill — a ?skill= override
    // never leaks into the payload (the builder only sees the query).
    expect(trimmed.payload.activeFilter).toBe("TypeScript");
    expect(trimmed.payload.matchedSkills).toEqual(
      trimmed.matchResult.matchedSkills,
    );
    // Projects are passed in matched (ranked) order, not source order.
    expect(trimmed.payload.projects.map((project) => project.id)).toEqual(
      trimmed.matchResult.matchedProjectIds,
    );
    expect(trimmed.payload.projects.length).toBeGreaterThan(0);
  });

  it("produces a null filter and empty projects when nothing matches", () => {
    const { payload } = buildChatRequestPayload("zzz qqq", projects);

    expect(payload.activeFilter).toBeNull();
    expect(payload.matchedSkills).toEqual([]);
    expect(payload.projects).toEqual([]);
  });
});
