# ADR-009: Client-Only Exploration Gamification

**Status:** Accepted  
**Date:** 2026-06

## Context

The portfolio should reward exploration — queries, skill filters, projects uncovered — with a quiet game-feel: a header progress ring, milestone toasts, adaptive prompt chips, and a command palette. The visual language must stay minimal (no confetti, badges, or celebration copy), the page must remain statically prerendered with no hydration mismatches, and visitor behavior must not become server-side tracking data.

Slice B already defined the event contract (`ExperienceSearchCallbacks`, ADR-008): `onQueryCompleted` is a pipeline **terminal** event that re-fires on reloads, back/forward re-runs, and identical resubmits, and `onSkillFilterApplied` fires for user clicks and `?skill=` URL syncs alike. Any consumer must dedupe.

## Decision

### Exploration state is a pure module plus a sessionStorage hook

`lib/exploration.ts` holds the deterministic model — event folding, progress derivation, milestones, chip ranking, versioned serialization — and `hooks/use-exploration.ts` owns React state and `sessionStorage` (key `cv-exploration-v1`). Nothing is sent to the server.

- **Privacy:** exploration is engagement nudging, not analytics; it never leaves the browser and needs no consent surface.
- **`sessionStorage` over `localStorage`:** progress resets per visit, so returning visitors get a fresh exploration arc instead of a permanently full ring.
- **`sessionStorage` over URL state:** exploration is private and high-churn; it would pollute the shareable `?q=`/`?skill=` scheme from ADR-008.
- **Hydration safety:** the server and the first client render use the empty state; the stored snapshot is merged in lazily — in the mount effect or just-in-time when the first signal arrives (a `?skill=` deep link records before parent effects run). Reads/writes are wrapped in try/catch for privacy modes, and `/` stays prerendered static.
- **Serialization is versioned** (`{ version: 1, … }`); corrupt, missing, or mismatched snapshots fall back to the empty state instead of crashing.

### Projects count as explored when they would be highlighted

Project exploration is **derived**, never reported by the UI: a project counts as explored when it would be highlighted in the grid, mirroring the highlight merge in `hooks/use-experience-search.ts` — the query's `matchedProjectIds` ∪ projects matching the active filter via `projectMatchesSkillLabel`, excluding the `__portfolio_no_skill_match__` sentinel (a UI flag, not a project). A standalone `skill_filtered` event marks the projects matching that skill as explored. This keeps the rule identical to what the visitor actually sees emphasized, and it is why `QueryCompletedEvent` carries `activeFilter`: matched ids alone undercount the highlight set when a `?skill=` override is active.

**Known, intentional divergence:** on the back/forward path where a `?skill=` param is removed and the search hook restores the match-derived filter, the restored filter can highlight projects that were never recorded as explored. The restore deliberately emits no `skill_filtered` signal (it is state reconciliation, not a new exploration act), so exploration undercounts on that path. Accepted: when the two disagree, the meter should err toward under- rather than over-counting.

### Progress formula, with the dead-end-skill rule

Progress is an integer 0–100: the mean of three capped sub-scores, rounded — but pinned to ≤99 until every sub-score is complete, so 100 always means "fully explored" rather than a rounding artifact.

| Sub-score | Formula |
|---|---|
| Queries | `min(distinctNormalizedQueries / 3, 1)` |
| Skill filters | `min(distinctEffectiveSkills / 3, 1)` |
| Projects | `min(exploredProjects / totalProjects, 1)` |

Queries are deduped by a normalized key (trim, lowercase, collapsed whitespace), which also absorbs the terminal-event re-fires from ADR-008. **Only effective skills count** — labels matching at least one project via `projectMatchesSkillLabel`. The skill graph intentionally contains dead-end labels (`React`, `Next.js` match zero projects in `data/`, pinned by a test); if they advanced progress, a visitor could reach "100% explored" without the grid ever reacting, which reads as a bug. Unknown project ids from stale snapshots are ignored the same way.

### Milestones fire once per session, with quiet copy

Four milestones — `first_answer` (first completed query), `first_filter` (first **effective** skill filter), `half_explored` (progress ≥ 50), `fully_explored` (progress = 100) — fire exactly once: fired ids are recorded in the persisted state, so restored sessions can never replay a toast; only milestones newly crossed by live events toast. When one event crosses several at once, the single toast slot shows the most significant. Copy principles: one short factual line, no exclamation marks, no "achievement/unlocked/level" vocabulary (pinned by a test) — e.g. "First answer streamed. The grid reranks as you ask." and "Every project explored. Thanks for the attention to detail."

The toast surface is a single slot (a newer milestone replaces the visible one), always-mounted as an `aria-live="polite" aria-atomic="true"` region, auto-dismissing after ~5s with the timer holding pointer hover and keyboard focus independently (it runs only while neither is held), layered between the response drawer's backdrop and its popup (z-65 vs. 60/70) so a toast fired while the drawer is open stays readable and dismissible instead of being dimmed — and pointer-blocked — by the backdrop. Milestones derive from terminal search phases, and milestones unlocked by a completed query additionally wait ~1.5s before entering the live region, so the response stream and grid filter-status announcements land first instead of three polite messages racing.

### Command palette on the Base UI Dialog primitive

`components/shared/command-palette.tsx` reuses `components/ui/dialog.tsx` with a new `command` popup variant, per ADR-007's "any future dialogs use the primitive" consequence: focus trap, Escape, scroll lock, and focus restore come for free. The list uses the combobox + `aria-activedescendant` pattern (DOM focus stays in the input; arrow keys move the active `role="option"`) rather than roving focus, so type-to-filter never has to relocate focus. Options come from the typed free text (always submittable as a query, first in the "Ask" group), `getPromptSuggestions()` ("Ask"), and **filterable** skill labels ("Filter by skill" — dead-end graph labels are excluded because they would be no-op commands). Selections delegate to the existing search hook, so URL sync (ADR-008) and exploration events flow through unchanged. The global Cmd/Ctrl+K listener lives in the always-mounted palette component; the header trigger renders an empty fixed-width shortcut placeholder until mounted (server and first client render agree), then fills in "⌘K" or "Ctrl K" for the detected platform — no hydration mismatch, no wrong-platform flash, no layout shift. Closing the palette always returns focus to the header trigger (`finalFocus`): the palette can open via the shortcut while focus sits inside the response drawer, which the single-modal rule unmounts, so "previously focused element" can no longer be trusted on any close path.

**Single-modal rule:** opening the palette closes the response drawer first; anything that opens the drawer closes the palette; Cmd/Ctrl+K toggles. **Busy rule:** while the pipeline is matching/streaming, "Ask" options are `aria-disabled` and Enter no-ops — the palette never aborts an in-flight stream — while skill filters stay enabled (they never fetch).

## Alternatives considered

| Alternative | Why not |
|---|---|
| Server-side / analytics-backed progress | Turns a UX nudge into behavioral tracking; requires consent UI; adds infrastructure for no visitor value. |
| `localStorage` persistence | Progress would never reset; a permanently full ring stops nudging and reads as stale state. |
| Counting raw `onQueryCompleted` events | ADR-008 terminal semantics would double-count reloads and back/forward; dedupe by normalized query key instead. |
| IntersectionObserver "project viewed" dwell tracking | Couples exploration to scroll behavior and adds an observer lifecycle for little gain; the highlight rule is deterministic, testable, and matches what search/filter interactions actually reveal. |
| Counting dead-end skill labels toward progress | "100% explored" while the grid never reacted to a filter reads as a bug; effective skills keep the meter honest. |
| Stacked/multi-toast notifications | Conflicts with the quiet-premium directive; stacked toasts read as gamification spam. |
| A toast library (sonner etc.) | One single-slot toast does not justify a dependency. |
| cmdk (or similar) for the palette | Adds a dependency with its own dialog implementation; the project already pays for an audited Base UI Dialog and the option list is small and static. |

## Consequences

- Exploration progress is per-tab and per-session; closing the tab resets it. Accepted as the point of the design.
- A milestone crossed but instantly replaced by a later one in the same event is only ever seen once; the single slot drops the older message by design.
- `QueryCompletedEvent` gained an `activeFilter` field (additive; pinned by reducer and hook tests) so exploration can mirror the highlight merge without re-deriving filter state.
- Adaptive chip ranking re-computes only when a query completes (the hook exposes a snapshot frozen at terminal events), so chips never reorder mid-interaction. Ranking tiers (stable within ties): unused suggestions leading to unexplored projects → other unused suggestions → already-asked suggestions. The suggestion→project mapping is precomputed by the caller by running each suggestion's query through `matchProjects` — the same token-scoring matcher the query hits on submit — so ranking sees exactly the projects the suggestion would actually surface (a skill-label shortcut undercounts), keeping `lib/exploration.ts` pure.
- If `data/` changes which labels are dead ends, the pinned test fails and this ADR's examples must be revisited together.
- `lib/exploration.ts` is fully unit-tested (folding, dedupe, the combined-highlight derivation, progress math incl. dead-end skills, milestone one-shot, versioned serialization round-trip, corrupt-input fallback) and `hooks/use-exploration.ts` has hook-level tests (persistence, hydration merge, no toast replay, chip-ranking freeze); UI layers stay thin.
