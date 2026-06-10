# Portfolio Website Requirements

## Source

This document is derived from `README.md` and exists to provide a single implementation spec for the project workflow. The canonical copy lives at `docs/requirements.md` (workflow tools may refer to `requirements.md` at repo root; keep them aligned or add a stub pointer if both exist).

## Product Goal

Build an interactive portfolio site for Vladyslav Avilov that lets visitors explore career history, projects, and skills through natural-language search with synchronized UI feedback and streamed answers.

## Functional Requirements

1. The home page must render an AI-focused portfolio experience with hero, experience grid, skill web, proof links, contact CTA, and response panel.
2. Users must be able to submit natural-language queries through the main search input and prompt chips.
3. Client-side matching must immediately rank relevant projects, highlight matching skills, and update the experience grid before the server response completes.
4. The experience grid must preserve relevance order from query matching within the existing featured/supporting layout.
5. The skill graph must support hover and click interactions and provide an alternate button-based filter control. **Clicking a graph node (including its label hit area) or a skill button must apply the same project filter as natural-language search.** When `prefers-reduced-motion` replaces the canvas with a static list, each skill must remain an interactive control that applies that filter.
6. `POST /api/chat` must accept a validated JSON request body with the prompt and matching context.
7. Empty or invalid API requests must return controlled non-5xx responses.
8. Off-topic prompts must be politely rejected (streamed plain text when Groq is available for intent classification).
9. When Groq is available, the server must classify intent and stream CV-grounded answers.
10. When Groq is unavailable or errors, CV-related prompts must receive a deterministic fallback as **HTTP 200** with a **finished plain-text body** (same content-type as successful streams), not a 5xx. The copy must come from the shared deterministic fallback builder so ranked project order is preserved. Non-CV prompts in that situation receive a short, explicit message that the assistant service is unavailable.
11. Fallback responses that mention strongest examples must respect ranked project order from the request payload.
12. The client must show the same deterministic fallback message whenever the stream is empty or the request fails after a search, so users always see helpful text instead of a blank panel.
13. Search and skill-filter state must be URL-driven: `?q=` runs the full search pipeline and `?skill=` applies a grid filter only, on initial load and back/forward navigation, without breaking static prerendering of `/`.
14. The response panel's thought trace must reflect the actual request lifecycle (match → request → stream, with skipped steps and a prepared-answer step on fallback) rather than a scripted animation.
15. A command palette must open via Cmd+K (mac) / Ctrl+K and a visible header trigger, offering free-text search (submitting the typed text as a query) plus two labelled, type-to-filter groups — "Ask" prompt suggestions and "Filter by skill" labels from the skill graph — where selections run the same search/filter paths as the primary controls. Only one modal may be open at a time (opening the palette closes the response drawer first), and while an answer is in flight the "Ask" options are disabled without aborting the stream while skill filters stay available.
16. The client must track exploration progress in `sessionStorage` only — distinct normalized queries completed, distinct skill filters applied (user clicks and `?skill=` URL syncs alike), and distinct projects explored, where a project counts as explored when it would be highlighted in the grid (query matches merged with projects matching the active filter, excluding the no-match sentinel) — and surface it as a subtle header progress ring with an explanatory tooltip. Progress is the mean of three capped sub-scores (queries / 3, effective skill filters / 3, explored projects / total projects) as an integer percentage; skill labels that match zero projects (dead-end graph nodes) must not advance progress, and reloads or back/forward re-runs must not double-count.
17. Newly crossed exploration milestones (first answer, first effective filter, half explored, fully explored) must appear as quiet, factual toasts — at most one visible at a time (a newer milestone replaces the visible one), auto-dismissing after ~5s, dismissible, and announced via a polite live region. Milestones restored from a previous page load must never replay their toasts.
18. Prompt suggestion chips must adapt to exploration state: suggestions whose normalized query has not been run rank first (among them, those whose matched content still includes unexplored projects come before fully explored content), and already-asked suggestions go last. The hero shows a window of the top 5 ranked suggestions, so an already-asked suggestion may leave the visible row and a fresh suggestion may enter it. Re-ranking happens only when a query completes (never mid-typing or on filter clicks), with smooth, stable-keyed reordering for surviving chips. The ranking restored from a stored session must apply silently on load; reorder animation runs only for re-ranks triggered by live query completions.
19. Interactive elements must share a consistent quiet game-feel: hover and pressed states on buttons/chips/toggles, a one-time highlight pulse on newly filtered cards, enter/exit animation on the active-filter chip, and tactile hover on skill graph nodes — with no layout shift from hover effects.

## Accessibility Requirements

1. The page must expose a skip link and semantic landmarks (including a footer for the contact region).
2. Primary interactive controls must have visible keyboard focus states.
3. The response panel must behave as a modal drawer with Escape support, trapped focus while open, and focus restoration on close.
4. Streamed response updates must be exposed to assistive technology with a live region.
5. Motion-heavy interactions must respect `prefers-reduced-motion` (including drawer open/close transitions where practical).
6. All gamification behaviors must respect `prefers-reduced-motion`: the progress ring jumps without animating, chips reorder without layout animation, toasts fade or appear instantly, card pulses are disabled, and palette transitions are instant. The ring must additionally not animate the initial restore of stored progress on any device.
7. The command palette must be fully keyboard-operable (combobox with `aria-activedescendant`, arrow-key navigation, Enter to select, Escape to close), and closing it must return focus to the trigger or previously focused element — never to the document body.
8. The progress ring must be a focusable `role="img"` element with an `aria-label` carrying the current percentage (e.g. "Exploration progress: 40%") and a tooltip shown on hover and focus, and the discovery toast must live in an always-mounted polite, atomic live region whose auto-dismiss timer pauses on pointer hover and keyboard focus, with a labelled dismiss button.

## Technical Requirements

1. The app must use Next.js App Router.
2. Shared portfolio data must come from `data/`.
3. Runtime validation must protect data and request handling from malformed input.
4. Dependencies used directly in source code must be declared directly in `package.json`.
5. Server logs must not include full request bodies or raw user prompts by default (lengths and counts are sufficient).

## Verification

1. `npm run lint` must pass.
2. `npm run build` must pass.
3. Focused automated tests should cover request validation, degraded-mode off-topic handling, intent JSON parsing, deterministic fallback copy, and relevance ordering where practical.
