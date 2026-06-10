# ADR-007: Base UI Dialog for the Response Drawer

**Status:** Accepted  
**Date:** 2026-06

## Context

The response panel (`components/shared/response-panel.tsx`) was a hand-rolled modal drawer: ~100 lines of manual focus-trap bookkeeping (querying focusable elements, intercepting `Tab`/`Shift+Tab`), an Escape key listener, body scroll locking via `document.body.style.overflow`, previous-focus capture/restore, and an always-mounted `<aside>` toggled with `translate-x-full` + `inert`/`aria-hidden`. This logic is easy to break (e.g. new focusable content invalidates the cached selector list) and duplicates what an accessibility-audited primitive provides.

The project already depends on `@base-ui/react` v1.3.0 for Button/Input primitives, which ships a Dialog component.

A migration spike verified the two open questions:

1. **Exit animations with the panel unmounting.** Base UI keeps `Dialog.Popup`/`Dialog.Backdrop` mounted while a CSS transition is running and tags them with `data-starting-style` / `data-ending-style` attributes (confirmed in `useTransitionStatus` and `stateAttributesMapping` in the installed package). Styling `data-ending-style:translate-x-full` with `transition-transform` reproduces the slide-out exactly; Base UI unmounts only after the transition completes.
2. **`prefers-reduced-motion`.** The transition utilities on the popup/backdrop are gated behind Tailwind's `motion-safe:` variant (and the global reduced-motion CSS in `globals.css` zeroes transition durations as a second layer). With reduced motion there is no transition property, so Base UI unmounts immediately — open/close becomes instant, matching the previous JS-based behavior.

## Decision

Replace the hand-rolled drawer with a **full Base UI Dialog migration**: `Dialog.Root` (controlled `open` + `onOpenChange`), `Dialog.Portal`, `Dialog.Backdrop`, and `Dialog.Popup` rendered as an `<aside>` via the `render` prop, wrapped by a new `components/ui/dialog.tsx` primitive with a CVA `drawer-right` variant. No mounted compatibility wrapper is needed.

## Rationale

- **Deletes the riskiest custom code** — focus trap, scroll lock, Escape handling, and focus restoration are provided by `modal={true}` (default): focus is trapped, page scroll is locked, Escape closes (`escapeKey` reason), outside/backdrop clicks close (`disablePointerDismissal` defaults to `false`), and focus returns to the previously focused element on close (`finalFocus` default).
- **Initial focus parity** — `initialFocus={closeButtonRef}` keeps the close button as the first focused element, as before.
- **Semantics preserved** — Base UI applies `role="dialog"` and `aria-modal="true"`; the explicit `aria-label="Portfolio response"` is kept on the popup.
- **Exit animation parity** — `data-starting-style`/`data-ending-style` + `transition-transform duration-300 ease-out` reproduce the 300 ms slide; the backdrop keeps its 300 ms opacity fade.
- **Streaming behavior untouched** — the 240 ms-debounced `aria-live="polite"` announcement region, the streaming cursor dot, and the markdown rendering are component-level concerns and were moved over verbatim.

## Alternatives Considered

| Alternative | Why not |
|---|---|
| Keep the hand-rolled drawer | Manual focus traps are a recurring source of a11y bugs (stale focusable lists, double scroll-lock writes). The project already pays for Base UI; not using its Dialog duplicates audited behavior. |
| Base UI Dialog for semantics only, always-mounted wrapper for animation | Only needed if exit animations were impossible. The spike showed `data-ending-style` + transitions handle unmount-after-animation natively, so the extra wrapper would be dead complexity. |
| `framer-motion` `AnimatePresence` around the popup | Requires `actionsRef`/manual unmount coordination with Base UI's lifecycle; CSS transitions achieve the same 300 ms slide with zero JS. |
| Radix UI Dialog | Equivalent capability, but would add a second headless-UI dependency alongside `@base-ui/react`. |

## Consequences

- The drawer subtree now unmounts when closed (previously it stayed in the DOM with `inert`). Markdown is re-rendered on reopen; content state lives in `portfolio-experience.tsx`, so nothing is lost.
- The panel renders in a portal at `<body>` instead of inline, which is what `z-[60]`/`z-[70]` were already designed for.
- Body scroll locking is handled by Base UI's scroll-lock implementation instead of `overflow: hidden`, which also compensates for scrollbar width (no layout shift on open).
- Any future dialogs should use `components/ui/dialog.tsx` (`center` variant available) rather than bespoke implementations.

## Addendum: ToggleGroup roving-tabindex keyboard model

The same migration slice replaced the hand-rolled skill filter buttons with the Base UI ToggleGroup primitive (`components/ui/toggle-group.tsx`). This changes the keyboard model: the group is now a **single Tab stop with arrow-key navigation between items** (roving tabindex), where previously every button was individually tabbable.

This is **accepted intentionally**. Roving tabindex is the standard, WAI-ARIA-recommended pattern for toggle groups: it keeps the page's Tab sequence short (one stop instead of N) and matches what keyboard and screen-reader users expect from a grouped control. Click/toggle behavior, `aria-pressed` state, and the `onFilterChange` contract are unchanged.
