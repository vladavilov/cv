# ADR-001: Next.js 15 with App Router

**Status:** Accepted  
**Date:** 2025-04

## Context

The portfolio site is a single-page application that also needs a server-side API route for LLM inference. It must support streaming responses, static pre-rendering of the main page, and deploy easily to Vercel or any Node.js host.

## Decision

Use **Next.js 15** with the **App Router** (`app/` directory) and **React 19**.

## Rationale

- **Unified full-stack framework** — pages, API routes, and static assets live in one repository with one build command. No need for a separate backend service.
- **App Router** — provides React Server Components, nested layouts, and the `route.ts` convention for API endpoints. The chat endpoint (`app/api/chat/route.ts`) is a plain `POST` handler with native `ReadableStream` support, which is exactly what the streaming AI response needs.
- **React 19 support** — Next.js 15 ships with first-class React 19 support, giving access to the latest concurrent features and hooks.
- **Static export** — the home page is statically rendered at build time (`next build`). Only the `/api/chat` route requires a runtime, keeping hosting costs near zero.
- **Ecosystem maturity** — extensive documentation, large community, battle-tested in production, and first-party Vercel deployment with zero configuration.

## Alternatives Considered

| Alternative | Why not |
|---|---|
| Vite + React SPA + separate Express API | Two deployables, more infrastructure to manage, no SSR/SSG out of the box. |
| Astro | Strong for static content, but weaker ecosystem for complex client-side interactivity (force graph, Framer Motion layout animations). |
| Remix | Viable, but smaller ecosystem for the AI/streaming tooling (Vercel AI SDK is optimised for Next.js). |

## Consequences

- The project depends on the Next.js release cycle for React version upgrades.
- Developers need familiarity with the App Router conventions (`page.tsx`, `route.ts`, `layout.tsx`).
- Deploying outside Vercel requires a Node.js runtime for the API route.
