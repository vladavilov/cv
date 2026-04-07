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

## Accessibility Requirements

1. The page must expose a skip link and semantic landmarks (including a footer for the contact region).
2. Primary interactive controls must have visible keyboard focus states.
3. The response panel must behave as a modal drawer with Escape support, trapped focus while open, and focus restoration on close.
4. Streamed response updates must be exposed to assistive technology with a live region.
5. Motion-heavy interactions must respect `prefers-reduced-motion` (including drawer open/close transitions where practical).

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
