# Portfolio Website Requirements

## Source

This document is derived from `README.md` and exists to provide a single implementation spec for the project workflow.

## Product Goal

Build an interactive portfolio site for Vladyslav Avilov that lets visitors explore career history, projects, and skills through natural-language search with synchronized UI feedback and streamed answers.

## Functional Requirements

1. The home page must render an AI-focused portfolio experience with hero, experience grid, skill web, proof links, contact CTA, and response panel.
2. Users must be able to submit natural-language queries through the main search input and prompt chips.
3. Client-side matching must immediately rank relevant projects, highlight matching skills, and update the experience grid before the server response completes.
4. The experience grid must preserve relevance order from query matching within the existing featured/supporting layout.
5. The skill graph must support hover and click interactions and provide an alternate button-based filter control.
6. `POST /api/chat` must accept a validated JSON request body with the prompt and matching context.
7. Empty or invalid API requests must return controlled non-5xx responses.
8. Off-topic prompts must be politely rejected.
9. When Groq is available, the server must classify intent and stream CV-grounded answers.
10. When Groq is unavailable or errors, CV-related prompts must receive a deterministic fallback response instead of failing.
11. Fallback responses that mention strongest examples must respect ranked project order.

## Accessibility Requirements

1. The page must expose a skip link and semantic landmarks.
2. Primary interactive controls must have visible keyboard focus states.
3. The response panel must behave as a modal drawer with Escape support, trapped focus while open, and focus restoration on close.
4. Streamed response updates must be exposed to assistive technology with a live region.
5. Motion-heavy interactions must respect `prefers-reduced-motion`.

## Technical Requirements

1. The app must use Next.js App Router.
2. Shared portfolio data must come from `data/`.
3. Runtime validation must protect data and request handling from malformed input.
4. Dependencies used directly in source code must be declared directly in `package.json`.

## Verification

1. `npm run lint` must pass.
2. `npm run build` must pass.
3. Focused automated tests should cover request validation, degraded-mode off-topic handling, and relevance ordering where practical.
