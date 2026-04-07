# ADR-006: Framer Motion for Layout Animation

**Status:** Accepted  
**Date:** 2025-04

## Context

The portfolio UI has several animated behaviours: project cards reorder and resize when search results change, cards fade/dim when not matched, and the response panel slides in/out. These animations must feel smooth, respect `prefers-reduced-motion`, and integrate cleanly with React's rendering model.

## Decision

Use **Framer Motion 12** for layout transitions and enter/exit animations.

## Rationale

- **Layout animations** — Framer Motion's `layout` prop on `motion.div` automatically animates position and size changes when React re-renders the bento grid in a new order. This is the core UX feature — when a search highlights certain projects, the grid re-sorts and cards animate to their new positions with no manual coordinate math.
- **Declarative API** — animations are expressed as React props (`initial`, `animate`, `exit`, `transition`), not imperative timelines. This keeps animation logic co-located with component markup.
- **`AnimatePresence`** — handles enter/exit animations for conditionally rendered elements (response panel, filter chips). Components animate out before being unmounted from the DOM.
- **`useReducedMotion`** — built-in hook that reads the OS-level `prefers-reduced-motion` setting and lets the app disable layout animations for users who need it. The bento grid uses this to conditionally set `layout={!shouldReduceMotion}`.
- **React 19 compatibility** — Framer Motion 12 is tested against React 19 and concurrent rendering.

## Alternatives Considered

| Alternative | Why not |
|---|---|
| CSS transitions / `@keyframes` | Cannot animate layout reflows (position changes from grid reorder). CSS can transition known property values but not "element moved from grid slot A to grid slot B". |
| React Spring | Capable, but `layout` animation (FLIP) support is less mature than Framer Motion's. |
| GSAP | Imperative API that doesn't compose well with React's declarative rendering. Requires refs and manual cleanup. |
| `tw-animate-css` only | Already used for simple CSS animations (fade, slide), but cannot handle layout reordering or presence-based exit animations. |
| Motion One | Lighter weight but lacks the `layout` animation primitive that is central to the bento grid interaction. |

## Consequences

- Framer Motion adds ~30 KB (gzipped) to the client bundle. This is acceptable given that animation is a core part of the portfolio's interaction model.
- All animated components must use `motion.*` wrappers, which adds a thin abstraction layer over standard HTML elements.
- Layout animations require stable `key` props on grid children to track identity across re-renders.
