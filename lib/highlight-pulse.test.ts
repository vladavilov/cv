import { describe, expect, it } from "vitest";

import {
  advanceHighlightEntries,
  createHighlightEntryState,
} from "@/lib/highlight-pulse";

describe("advanceHighlightEntries", () => {
  it("assigns the new epoch to every id of the first non-empty set", () => {
    const state = advanceHighlightEntries(createHighlightEntryState(), ["a", "b"]);

    expect(state.epoch).toBe(1);
    expect(state.entries.get("a")).toBe(1);
    expect(state.entries.get("b")).toBe(1);
  });

  it("returns the same state object for an identical set (no new entries, idempotent)", () => {
    const first = advanceHighlightEntries(createHighlightEntryState(), ["a", "b"]);

    // Order and duplicates must not count as a change.
    const resubmit = advanceHighlightEntries(first, ["b", "a", "a"]);

    expect(resubmit).toBe(first);
    // Render-phase double invocation (StrictMode) stays stable too.
    expect(advanceHighlightEntries(resubmit, ["a", "b"])).toBe(first);
  });

  it("gives only the delta new epochs when the set overlaps the previous one", () => {
    const first = advanceHighlightEntries(createHighlightEntryState(), ["a", "b"]);
    const second = advanceHighlightEntries(first, ["b", "c"]);

    expect(second.epoch).toBe(2);
    // Survivor keeps its original entry epoch — its overlay must not remount.
    expect(second.entries.get("b")).toBe(1);
    // Genuinely new entrant pulses with the new epoch.
    expect(second.entries.get("c")).toBe(2);
    // Departed id is dropped.
    expect(second.entries.has("a")).toBe(false);
  });

  it("clears entries on an empty set and re-pulses an id that re-enters later", () => {
    const first = advanceHighlightEntries(createHighlightEntryState(), ["a"]);
    const cleared = advanceHighlightEntries(first, []);

    expect(cleared.entries.size).toBe(0);

    const reentered = advanceHighlightEntries(cleared, ["a"]);
    expect(reentered.epoch).toBe(2);
    expect(reentered.entries.get("a")).toBe(2);
  });

  it("keeps the empty state stable across repeated empty sets", () => {
    const empty = createHighlightEntryState();

    expect(advanceHighlightEntries(empty, [])).toBe(empty);

    const cleared = advanceHighlightEntries(
      advanceHighlightEntries(empty, ["a"]),
      [],
    );
    expect(advanceHighlightEntries(cleared, [])).toBe(cleared);
  });
});
