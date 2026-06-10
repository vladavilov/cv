// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { StrictMode, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useExperienceSearch } from "@/hooks/use-experience-search";
import {
  buildChatRequestPayload,
  type ExperienceSearchCallbacks,
} from "@/lib/experience-search-reducer";
import { getChatFallbackFromRequest } from "@/lib/fallback-responses";
import type { Project } from "@/lib/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { push, replace } = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/",
}));

function makeProject(
  overrides: Partial<Project> & Pick<Project, "id" | "title">,
): Project {
  return {
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
  makeProject({
    id: "react-ui",
    title: "React Dashboard",
    summary: "React frontend work",
    stack: ["React"],
    activeSkills: ["TypeScript"],
  }),
  makeProject({
    id: "java-core",
    title: "Trading Engine",
    summary: "Low latency trading systems",
    stack: ["Java"],
    activeSkills: ["Java"],
  }),
];

/**
 * Literal copy `getChatFallbackFromRequest` produces for "react work" against
 * the fixture above. Pinned as a golden string so a copy regression fails
 * loudly instead of being re-derived from the implementation under test.
 */
const GOLDEN_FALLBACK =
  "I prioritized the portfolio around TypeScript. " +
  "The strongest examples are React Dashboard. " +
  "Matched skills: TypeScript. " +
  "Prompt: react work.";

/** Streaming /api/chat stub; each call gets its own chunk cursor. */
function streamingFetch(chunks: string[]) {
  const encoder = new TextEncoder();

  return vi.fn(async () => {
    let index = 0;

    return {
      ok: true,
      body: {
        getReader: () => ({
          read: async () => {
            const chunk = chunks[index];
            if (chunk === undefined) {
              return { done: true as const, value: undefined };
            }
            index += 1;
            return { done: false as const, value: encoder.encode(chunk) };
          },
        }),
      },
    };
  });
}

/**
 * Like `streamingFetch`, but honors AbortSignal the way real fetch does:
 * the promise rejects on abort. Resolution is deferred a microtask so an
 * abort issued synchronously after the call (StrictMode cleanup) wins.
 */
function abortAwareStreamingFetch(chunks: string[]) {
  const encoder = new TextEncoder();

  return vi.fn((_url: string, init?: RequestInit) => {
    const signal = init?.signal as AbortSignal | undefined;
    let index = 0;

    return new Promise((resolve, reject) => {
      const fail = () => reject(new Error("AbortError"));
      if (signal?.aborted) {
        fail();
        return;
      }
      signal?.addEventListener("abort", fail);

      queueMicrotask(() => {
        if (signal?.aborted) {
          return;
        }
        resolve({
          ok: true,
          body: {
            getReader: () => ({
              read: async () => {
                const chunk = chunks[index];
                if (chunk === undefined) {
                  return { done: true as const, value: undefined };
                }
                index += 1;
                return { done: false as const, value: encoder.encode(chunk) };
              },
            }),
          },
        });
      });
    });
  });
}

function makeCallbacks(): Required<ExperienceSearchCallbacks> {
  return {
    onQueryCompleted: vi.fn(),
    onSkillFilterApplied: vi.fn(),
    onSkillFilterCleared: vi.fn(),
  };
}

function renderSearchHook(callbacks?: ExperienceSearchCallbacks) {
  return renderHook(() => useExperienceSearch({ projects, callbacks }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useExperienceSearch URL synchronization", () => {
  it("skips the URL echo of its own ?q= write instead of re-running the pipeline", async () => {
    const fetchMock = streamingFetch(["Answer."]);
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderSearchHook();

    await act(async () => {
      result.current.submit("react work");
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/?q=react+work", { scroll: false });
    expect(result.current.phase).toBe("done");

    // The SearchParamsSync bridge re-fires with exactly the pair the hook
    // just wrote; this must be a no-op.
    await act(async () => {
      result.current.syncFromUrl("react work", "");
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe("done");
    expect(result.current.response).toBe("Answer.");
  });

  it("applies a skill-only param change without refetching, firing onSkillFilterApplied once", async () => {
    const fetchMock = streamingFetch(["Answer."]);
    vi.stubGlobal("fetch", fetchMock);
    const callbacks = makeCallbacks();

    const { result } = renderSearchHook(callbacks);

    await act(async () => {
      result.current.syncFromUrl("react work", "");
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(callbacks.onSkillFilterApplied).toHaveBeenCalledTimes(0);

    // Back/forward navigation where only ?skill= changed.
    await act(async () => {
      result.current.syncFromUrl("react work", "Java");
    });

    expect(result.current.activeFilter).toBe("Java");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(callbacks.onSkillFilterApplied).toHaveBeenCalledTimes(1);
    expect(callbacks.onSkillFilterApplied).toHaveBeenCalledWith("Java");

    // Removing the skill param restores the match-derived filter ("react
    // work" matches TypeScript) instead of clearing — the same URL must
    // yield the same state as a fresh ?q= load, still without a fetch and
    // without filter callbacks (nothing was applied or cleared by the user).
    await act(async () => {
      result.current.syncFromUrl("react work", "");
    });

    expect(result.current.activeFilter).toBe("TypeScript");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(callbacks.onSkillFilterApplied).toHaveBeenCalledTimes(1);
    expect(callbacks.onSkillFilterCleared).not.toHaveBeenCalled();
  });

  it("clears the filter on the skill-removed path only when the query matched no skills", async () => {
    const fetchMock = streamingFetch(["Answer."]);
    vi.stubGlobal("fetch", fetchMock);
    const callbacks = makeCallbacks();

    const { result } = renderSearchHook(callbacks);

    // "trading systems" matches the java-core project by words but no skill
    // keyword group, so there is no match-derived filter to restore.
    await act(async () => {
      result.current.syncFromUrl("trading systems", "Java");
    });
    expect(result.current.activeFilter).toBe("Java");

    await act(async () => {
      result.current.syncFromUrl("trading systems", "");
    });

    expect(result.current.activeFilter).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(callbacks.onSkillFilterCleared).toHaveBeenCalledTimes(1);
  });

  it("completes a ?q= deep link under StrictMode's mount→cleanup→remount cycle", async () => {
    // Reproduces the dev-only deadlock: mount-1's URL sync starts the
    // pipeline and records the synced pair; the StrictMode cleanup aborts
    // the fetch; the remounted sync would then short-circuit on the
    // identical signature and never restart. The fetch mock must reject on
    // abort (like real fetch) for this test to discriminate.
    const fetchMock = abortAwareStreamingFetch(["Answer."]);
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(
      () => {
        const search = useExperienceSearch({ projects });
        const { syncFromUrl } = search;
        // Mirrors SearchParamsSync: an effect that re-fires per StrictMode
        // setup pass, interleaved with the hook's own cleanup.
        useEffect(() => {
          syncFromUrl("react work", "");
        }, [syncFromUrl]);
        return search;
      },
      { wrapper: StrictMode },
    );

    // Flush the deferred fetch resolution and stream consumption.
    await act(async () => {});

    // Dev-only double fetch: the first is aborted by the StrictMode
    // cleanup, the second (from the remounted sync) completes.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.phase).toBe("done");
    expect(result.current.response).toBe("Answer.");
  });

  it("runs one pipeline with the skill override active when the initial URL carries both ?q= and ?skill=", async () => {
    const fetchMock = streamingFetch(["Answer."]);
    vi.stubGlobal("fetch", fetchMock);
    const callbacks = makeCallbacks();

    const { result } = renderSearchHook(callbacks);

    // Deep link / initial load with both params present.
    await act(async () => {
      result.current.syncFromUrl("react work", "Java");
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(callbacks.onSkillFilterApplied).toHaveBeenCalledTimes(1);
    expect(callbacks.onSkillFilterApplied).toHaveBeenCalledWith("Java");
    // ?skill= wins over the query-derived filter ("react work" → TypeScript).
    expect(result.current.activeFilter).toBe("Java");
    expect(result.current.phase).toBe("done");
    expect(callbacks.onQueryCompleted).toHaveBeenCalledTimes(1);
  });

  it("treats a back/forward re-sync of the same ?q=/?skill= pair as a no-op", async () => {
    const fetchMock = streamingFetch(["Answer."]);
    vi.stubGlobal("fetch", fetchMock);
    const callbacks = makeCallbacks();

    const { result } = renderSearchHook(callbacks);

    await act(async () => {
      result.current.syncFromUrl("react work", "Java");
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(callbacks.onSkillFilterApplied).toHaveBeenCalledTimes(1);

    // Back/forward lands on the exact same pair: no duplicate fetch, no
    // repeated filter callback, state untouched.
    await act(async () => {
      result.current.syncFromUrl("react work", "Java");
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(callbacks.onSkillFilterApplied).toHaveBeenCalledTimes(1);
    expect(result.current.activeFilter).toBe("Java");
    expect(result.current.phase).toBe("done");
  });

  it("re-runs the pipeline and fires onQueryCompleted again on back to bare URL then forward to the same ?q=", async () => {
    const fetchMock = streamingFetch(["Answer."]);
    vi.stubGlobal("fetch", fetchMock);
    const callbacks = makeCallbacks();

    const { result } = renderSearchHook(callbacks);

    // Deep link / initial load with ?q=.
    await act(async () => {
      result.current.syncFromUrl("react work", "");
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(callbacks.onQueryCompleted).toHaveBeenCalledTimes(1);

    // Back to the bare URL: pristine reset.
    await act(async () => {
      result.current.syncFromUrl("", "");
    });
    expect(result.current.phase).toBe("idle");
    expect(result.current.panelOpen).toBe(false);

    // Forward to the same ?q=: this is a genuine q change relative to the
    // bare URL, so the pipeline re-runs and the terminal event fires again.
    await act(async () => {
      result.current.syncFromUrl("react work", "");
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.panelOpen).toBe(true);
    expect(callbacks.onQueryCompleted).toHaveBeenCalledTimes(2);
    expect(callbacks.onQueryCompleted).toHaveBeenLastCalledWith({
      query: "react work",
      matchedSkills: ["TypeScript"],
      matchedProjectIds: ["react-ui"],
      activeFilter: "TypeScript",
      outcome: "done",
    });
  });
});

describe("useExperienceSearch pipeline lifecycle", () => {
  it("re-runs the pipeline and fires onQueryCompleted again on an identical resubmit", async () => {
    const fetchMock = streamingFetch(["Answer."]);
    vi.stubGlobal("fetch", fetchMock);
    const callbacks = makeCallbacks();

    const { result } = renderSearchHook(callbacks);

    await act(async () => {
      result.current.submit("react work");
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(callbacks.onQueryCompleted).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.submit("react work");
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(callbacks.onQueryCompleted).toHaveBeenCalledTimes(2);
    expect(result.current.phase).toBe("done");
  });

  it("shows the real deterministic fallback copy when the stream is empty", async () => {
    const fetchMock = streamingFetch([]);
    vi.stubGlobal("fetch", fetchMock);
    const callbacks = makeCallbacks();

    const { result } = renderSearchHook(callbacks);

    await act(async () => {
      result.current.submit("react work");
    });

    expect(result.current.phase).toBe("fallback");
    expect(result.current.response).toBe(GOLDEN_FALLBACK);
    // Same string the production fallback builder yields for this payload.
    expect(result.current.response).toBe(
      getChatFallbackFromRequest(buildChatRequestPayload("react work", projects).payload),
    );
    expect(callbacks.onQueryCompleted).toHaveBeenCalledTimes(1);
    expect(callbacks.onQueryCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "fallback" }),
    );
  });

  it("shows the real deterministic fallback copy when the request fails", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchMock);
    const callbacks = makeCallbacks();

    const { result } = renderSearchHook(callbacks);

    await act(async () => {
      result.current.submit("react work");
    });

    expect(result.current.phase).toBe("fallback");
    expect(result.current.response).toBe(GOLDEN_FALLBACK);
    expect(result.current.response).toBe(
      getChatFallbackFromRequest(buildChatRequestPayload("react work", projects).payload),
    );
    expect(callbacks.onQueryCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "fallback" }),
    );
  });

  it("aborts the in-flight fetch when a new search is submitted", () => {
    const signals: AbortSignal[] = [];
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      signals.push(init.signal as AbortSignal);
      // Never settles: the first request must die by abort, not resolution.
      return new Promise<Response>(() => {});
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderSearchHook();

    act(() => {
      result.current.submit("react work");
    });
    expect(signals).toHaveLength(1);
    expect(signals[0]!.aborted).toBe(false);

    act(() => {
      result.current.submit("java systems");
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(signals[0]!.aborted).toBe(true);
    expect(signals[1]!.aborted).toBe(false);
  });

  it("aborts the in-flight fetch on unmount", () => {
    const signals: AbortSignal[] = [];
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      signals.push(init.signal as AbortSignal);
      return new Promise<Response>(() => {});
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderSearchHook();

    act(() => {
      result.current.submit("react work");
    });
    expect(signals[0]!.aborted).toBe(false);

    unmount();

    expect(signals[0]!.aborted).toBe(true);
  });
});
