# ADR-003: Tailwind CSS 4 + shadcn/ui

**Status:** Accepted  
**Date:** 2025-04

## Context

The site needs a styling system that supports rapid UI development, a consistent dark theme, and accessible interactive components (buttons, cards, badges, inputs) without building a design system from scratch.

## Decision

Use **Tailwind CSS 4** for utility-first styling and **shadcn/ui** for pre-built, accessible UI primitives.

## Rationale

- **Utility-first** — Tailwind eliminates context-switching between markup and stylesheets. Layout, spacing, colour, and responsive breakpoints are co-located with the component markup, which is ideal for a single-developer project.
- **Tailwind CSS 4** — the latest major version uses a Rust-based engine (`@tailwindcss/postcss`) with significantly faster build times and native CSS cascade layers. The new CSS-first configuration replaces `tailwind.config.ts` with standard CSS custom properties, simplifying the theming setup.
- **shadcn/ui** — provides copy-paste components (not an npm dependency) built on Radix primitives. Components ship unstyled and are customised via Tailwind classes, so they integrate seamlessly without fighting a third-party theme. The project uses `badge`, `button`, `card`, and `input`.
- **Dark theme** — Tailwind's `dark:` variant combined with CSS custom properties in `globals.css` provides a single-source-of-truth colour system. The entire palette is defined as HSL tokens and toggled by a `dark` class on `<html>`.
- **`tw-animate-css`** — adds Tailwind-compatible animation utilities (fade, slide, scale) that complement Framer Motion for simpler CSS-only transitions.

## Alternatives Considered

| Alternative | Why not |
|---|---|
| CSS Modules | More boilerplate, harder to maintain consistent spacing/colour tokens across many components. |
| Chakra UI / MUI | Heavier runtime, opinionated theming that would conflict with the custom dark palette, and harder to get a distinctive visual identity. |
| Vanilla Extract | Type-safe but adds build complexity; overkill for a single-page portfolio. |
| Panda CSS | Promising but less mature ecosystem and smaller community at the time of evaluation. |

## Consequences

- All styling is expressed as Tailwind utility classes in JSX. Developers need familiarity with Tailwind's class naming conventions.
- shadcn/ui components are vendored in `components/ui/` and are the project's responsibility to maintain and update.
- The design system is lightweight and intentional — only four primitives are used, keeping the bundle small.
