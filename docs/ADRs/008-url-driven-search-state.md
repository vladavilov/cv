# ADR-008: URL-Driven Search State (?q= and ?skill=)

**Status:** Accepted  
**Date:** 2026-06

## Context

Search and skill-filter state lived only in component memory: results were not shareable, reloads lost context, and Back/Forward did nothing. Slice B extracted search orchestration into `hooks/use-experience-search.ts` (a pure reducer in `lib/experience-search-reducer.ts` plus a side-effect layer), which created a single place to attach URL synchronization.

Constraints:

- `app/page.tsx` is a server component and the page must stay statically prerendered. `useSearchParams` in a client component suspends the tree up to the nearest Suspense boundary during prerender; an ill-placed boundary silently bails the whole page out to client-side rendering.
- A query submit triggers a full pipeline (client-side ranking, `/api/chat` stream, panel opens); a skill click applies a grid filter only (no API call, no panel). The URL scheme must preserve this distinction.
- Back/Forward must re-sync state without re-running an identical in-flight query in a loop.

## Decision

Two query parameters with different semantics and different history behavior:

| Param | Meaning | History write |
|---|---|---|
| `?q=` | Submitted natural-language query; runs the full search pipeline | `router.push` (each submit is a history entry; Back returns to the previous state) |
| `?skill=` | Active skill filter; grid filter only, no API call | `router.replace` (filter toggles do not spam history) |

Read semantics (initial load **and** every back/forward navigation):

- `?q=` present → run the full pipeline: rank grid, send `/api/chat` request, open the panel.
- `?skill=` present (alone) → apply the filter only.
- Both present → run `q`'s pipeline unchanged (the API payload uses the query-derived filter, so the deterministic fallback copy is identical to a plain submit), then `?skill=` overrides the active filter in the UI.
- Neither present → reset to the pristine state (this is how Back "undoes" a search).
- Clearing the search (empty submit) pushes the bare pathname.

### Suspense placement

`useSearchParams` lives in a dedicated null-rendering leaf, `components/shared/search-params-sync.tsx`, wrapped in its own `<Suspense fallback={null}>` inside `PortfolioExperience`. It reports `(q, skill)` to the hook via a stable callback. Only this empty leaf is deferred, so the rest of the page keeps prerendering (verified: `next build` reports `/` as prerendered static content) and there is nothing to mismatch during hydration. URL **writes** use `useRouter`/`usePathname`, which need no boundary.

### Loop and supersede guards

The hook tracks the last `(q, skill)` pair it either wrote to the URL or applied from it (`lastSyncedParamsRef`):

- After the hook writes the URL itself, the bridge re-fires with the same pair and is ignored — no double pipeline run.
- On back/forward, if only `skill` changed while `q` is unchanged, the filter is adjusted without re-fetching.
- A genuinely new `q` aborts the in-flight request (`AbortController.abort()`) before starting the next one.

## Accepted trade-offs

- **Clearing a filter while `?q=` is set** removes `?skill=` from the URL; a reload then re-applies the query-derived filter (the URL captures query intent, not the cleared-filter nuance). An empty-value sentinel (`?skill=`) was rejected as ugly and confusing to share.
- **Panel visibility is not in the URL.** Loading a `?q=` link opens the panel (the pipeline runs), and closing the panel does not touch the URL. The identical-pair guard only suppresses re-syncs where `(q, skill)` matches the last applied pair — the echo of the hook's own URL write, and back/forward steps where only `?skill=` changed (those adjust the filter without refetching or reopening the panel). Leaving and returning is different: navigating Back to the bare URL resets to pristine state, and navigating Forward to the same `?q=` is a genuine query change relative to that bare state, so the pipeline re-runs and the panel reopens. Encoding open/closed state in the URL was judged history noise.
- **Submitting the same query twice in a row** re-runs the pipeline (user asked for it) but produces no new history entry (`router.push` with an identical URL), so Back still leaves the query in one step.
- `?skill=` accepts any string; an unknown skill simply matches no projects, which the grid already renders as a "filter active, no matches" state — no validation layer needed.

## Exploration callback semantics

`onQueryCompleted` (see `ExperienceSearchCallbacks` in `lib/experience-search-reducer.ts`) is a **pipeline terminal event**, not a unique-exploration event. Because URL navigation re-runs the pipeline, it fires on every completion, including:

- initial page load / reload of a `?q=` link,
- back/forward navigations that re-run a query (e.g. Back to the bare URL, then Forward to the same `?q=`),
- identical resubmits of the same query.

Consumers tracking exploration progress (the gamification slice) MUST dedupe, e.g. by a normalized query key. `onSkillFilterApplied` likewise fires for both user clicks and `?skill=` URL syncs. These semantics are pinned by hook-level tests in `hooks/use-experience-search.test.ts`.

## Alternatives considered

| Alternative | Why not |
|---|---|
| Hash fragment (`#q=…`) | Not sent to the server, invisible to analytics/prerender tooling, nonstandard for shareable search state. |
| `window.location` + `popstate` listener | Bypasses the App Router; `useSearchParams` is the supported reactive primitive and composes with future router features. |
| Putting `useSearchParams` directly in `PortfolioExperience` | Would force the Suspense boundary around the whole experience, demoting the entire page to client-side rendering during prerender. |
| Storing state in `sessionStorage` | Survives reloads but is not shareable and fights the browser history model. |
