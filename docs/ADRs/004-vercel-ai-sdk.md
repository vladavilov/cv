# ADR-004: Vercel AI SDK for Streaming

**Status:** Accepted  
**Date:** 2025-04

## Context

The chat API route needs to stream LLM-generated tokens to the browser in real time and support structured output (intent classification via JSON schema). The solution must work with Next.js App Router API routes and the chosen LLM provider (Groq).

## Decision

Use the **Vercel AI SDK** (`ai` package) with the `@ai-sdk/groq` provider adapter.

## Rationale

- **Provider-agnostic API** — the SDK abstracts LLM providers behind a unified interface (`streamText`, `generateObject`). Switching from Groq to OpenAI, Anthropic, or any other supported provider requires changing a single import and model string, not rewriting streaming logic.
- **First-class streaming** — `streamText().toTextStreamResponse()` returns a standard `Response` with a `ReadableStream` body that works natively with Next.js App Router. No manual chunked-encoding, no SSE framing, no WebSocket setup.
- **Structured output** — `generateObject()` with a Zod schema produces typed, validated JSON from the LLM. This powers the intent classifier (`CV_PERSON_QUESTION` vs. `OTHER`) with compile-time type safety.
- **Built for Next.js** — the SDK is designed and tested against Next.js App Router conventions. Edge and Node.js runtimes are both supported.
- **Minimal footprint** — only two functions are imported (`streamText`, `generateObject`). The SDK does not impose UI components, state management, or client-side hooks.

## Alternatives Considered

| Alternative | Why not |
|---|---|
| Raw `fetch` + manual `ReadableStream` | Works, but requires hand-rolling token concatenation, error handling, and backpressure management. The SDK handles this reliably. |
| LangChain JS | Much heavier dependency, designed for complex chains/agents. Overkill for a two-call pipeline (classify → answer). |
| Groq SDK directly | Would work but ties the codebase to a single provider. The Vercel AI SDK's adapter layer keeps provider migration trivial. |

## Consequences

- The project takes a dependency on the Vercel AI SDK release cycle. Breaking changes in the `ai` package may require updates.
- The SDK's streaming format is plain text (not SSE or JSON patches), which is simpler but means the client reads raw text chunks rather than structured events.
- Adding new AI features (e.g., tool calling, multi-turn chat) is straightforward via additional SDK primitives.
