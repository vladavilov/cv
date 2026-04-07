# ADR-002: Groq as LLM Inference Provider

**Status:** Accepted  
**Date:** 2025-04

## Context

The portfolio site needs to answer natural-language questions about CV content in real time. This requires an LLM inference backend that is fast enough for interactive streaming, affordable for a personal project with unpredictable traffic, and simple to integrate without managing infrastructure.

## Decision

Use **Groq** as the LLM inference provider, accessed through the `@ai-sdk/groq` adapter.

### Models in use

| Role | Model | Why |
|---|---|---|
| Intent classification | `openai/gpt-oss-120b` | High-accuracy structured output for a simple binary classification task. |
| CV search / answer | `llama-3.3-70b-versatile` | Strong instruction-following and concise generation; 70B is more than sufficient for grounded Q&A over a single CV document. |

## Rationale

### Free tier covers project needs

Groq provides a generous free tier with rate limits that comfortably accommodate a portfolio site's traffic profile (sporadic bursts from recruiters and hiring managers, not sustained high-throughput). There is no monthly bill for typical usage, which is critical for a personal/career project that must run indefinitely at near-zero cost.

### Fastest inference available

Groq's custom LPU hardware delivers token generation speeds significantly faster than GPU-based providers. For a portfolio site, perceived latency is a UX priority — visitors expect near-instant responses, not multi-second waits. Groq's time-to-first-token and tokens-per-second are among the lowest and highest in the industry respectively, making the streaming experience feel snappy.

### Zero infrastructure to manage

Groq is a fully managed API. There is no GPU provisioning, container orchestration, model weight hosting, or scaling configuration. A single environment variable (`GROQ_API_KEY`) is the entire setup. This aligns with the project's goal of minimal operational overhead.

### Easy deployment

Integration is a single npm package (`@ai-sdk/groq`) plus one API key. The key is set as an environment variable in Vercel (or any host), and the API route works immediately. No Docker images, no sidecar services, no warm-up time.

### Access to high-quality open models

Groq hosts a curated set of open-weight models (LLaMA, Mistral, Gemma, etc.) that are more than sufficient for grounded CV Q&A. The project does not need GPT-4-class reasoning — it needs fast, accurate extraction from a known document. Models like `llama-3.3-70b-versatile` excel at this task at a fraction of the cost (free) and latency of proprietary alternatives.

### Graceful degradation

The site is architected so that if Groq is unreachable or the API key is missing, a deterministic fallback response is generated client-side from matched skills and project metadata. This means the core portfolio experience is never broken, and Groq is a progressive enhancement rather than a hard dependency.

## Alternatives Considered

| Alternative | Why not |
|---|---|
| OpenAI (GPT-4o / GPT-4o-mini) | Higher latency, no free tier sufficient for ongoing use, per-token cost adds up for a zero-budget personal project. |
| Anthropic (Claude) | Excellent quality but no free tier, higher cost, and slower streaming than Groq for this use case. |
| Self-hosted (Ollama / vLLM) | Requires a GPU server, adds infrastructure complexity and cost. Defeats the goal of zero-ops deployment. |
| Replicate / Together AI | Viable alternatives with free tiers, but Groq's inference speed is materially faster, and the Vercel AI SDK integration is mature. |
| Cloudflare Workers AI | Limited model selection and context window sizes at the time of evaluation. |

## Consequences

- The project depends on Groq's API availability and free-tier terms. If Groq changes pricing or discontinues the free tier, the fallback mechanism ensures the site continues to function while a migration to another provider (a single adapter swap in the Vercel AI SDK) is completed.
- Model selection is limited to what Groq hosts. This is acceptable because the task (grounded Q&A over a short document) does not require frontier-class models.
- The two-model pipeline (intent classification + CV search) makes two sequential API calls per query, but Groq's speed keeps total latency under ~1 second in practice.
