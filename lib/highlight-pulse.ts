/**
 * Per-card one-time pulse tracking for the bento grid (req 19).
 *
 * Each highlighted card keys its pulse overlay by the epoch at which it
 * ENTERED the highlight set, so when the set changes only genuinely new
 * entrants remount their overlay and pulse — cards surviving from the
 * previous set keep their finished overlay untouched.
 */

export type HighlightEntryState = {
  /** Advances once per distinct non-empty highlight set. */
  epoch: number;
  /** Highlighted project id -> epoch at which it entered the set. */
  entries: ReadonlyMap<string, number>;
};

export function createHighlightEntryState(): HighlightEntryState {
  return { epoch: 0, entries: new Map() };
}

/**
 * Folds the next highlight set into the entry state.
 *
 * - Same set (any order/duplicates): returns `state` unchanged, so render-phase
 *   ref updates stay idempotent (StrictMode double-render safe) and identical
 *   resubmits never re-pulse.
 * - Changed set: advances the epoch; ids already present keep their original
 *   entry epoch, ids entering get the new one, ids leaving are dropped.
 * - Empty set: clears all entries (epoch is retained), so a card re-entering
 *   on a later filter gets a fresh epoch and pulses again.
 */
export function advanceHighlightEntries(
  state: HighlightEntryState,
  highlightedIds: readonly string[],
): HighlightEntryState {
  const idSet = new Set(highlightedIds);

  if (idSet.size === 0) {
    return state.entries.size === 0 ? state : { epoch: state.epoch, entries: new Map() };
  }

  let isSameSet = idSet.size === state.entries.size;
  if (isSameSet) {
    for (const id of idSet) {
      if (!state.entries.has(id)) {
        isSameSet = false;
        break;
      }
    }
  }
  if (isSameSet) {
    return state;
  }

  const nextEpoch = state.epoch + 1;
  const entries = new Map<string, number>();
  for (const id of idSet) {
    entries.set(id, state.entries.get(id) ?? nextEpoch);
  }
  return { epoch: nextEpoch, entries };
}
