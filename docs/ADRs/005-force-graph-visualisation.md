# ADR-005: d3-force + react-force-graph-2d for Skill Graph

**Status:** Accepted  
**Date:** 2025-04

## Context

The portfolio includes an interactive skill visualisation that shows ~30 skill nodes across five categories (AI & ML, Languages, Frontend, Backend, DevOps) with links expressing relationships. Users need to click nodes to filter projects and hover to inspect details. The visualisation must render efficiently, respond to window resizing, and integrate with React state.

## Decision

Use **`d3-force`** for the physics simulation and **`react-force-graph-2d`** as the React-compatible canvas renderer.

## Rationale

- **Physics-based layout** — `d3-force` computes node positions using configurable forces (charge, collision, centering, links). This produces organic, readable layouts without manual positioning, and the graph gracefully adapts when nodes are added or removed.
- **Canvas rendering** — `react-force-graph-2d` renders to `<canvas>`, which handles dozens of nodes with smooth 60fps animation. SVG-based alternatives struggle with performance when nodes have continuous position updates from the simulation.
- **React integration** — the library accepts nodes/links as props, supports event callbacks (`onNodeClick`, `onNodeHover`), and re-renders on prop changes. This fits naturally into the React unidirectional data flow used throughout the app.
- **Custom rendering** — the `nodeCanvasObject` callback allows fully custom node painting (category-coloured circles, labels, highlight rings), avoiding the constraints of a pre-built chart component.
- **Lightweight** — `d3-force` is a standalone D3 module (~15 KB), not the full D3 bundle. Combined with `react-force-graph-2d`, the total addition is modest.

## Alternatives Considered

| Alternative | Why not |
|---|---|
| Full D3.js (SVG) | Heavier bundle, DOM-based rendering is slower for continuous animation, and integrating D3's imperative DOM manipulation with React is awkward. |
| vis.js / vis-network | Larger bundle, more opinionated styling, harder to achieve the custom visual style. |
| Cytoscape.js | Powerful but heavy (~400 KB), designed for complex graph analysis rather than simple interactive visualisation. |
| React Flow | Optimised for node-based editors (drag-and-drop workflows), not force-directed exploratory graphs. |
| Static SVG / CSS grid | No physics-based layout, no emergent clustering by category, less engaging interaction. |

## Consequences

- The skill graph renders on `<canvas>`, so individual nodes are not DOM elements and cannot be targeted by CSS or assistive technology directly. Accessibility is handled by wrapping the canvas in a labelled region and providing a text-based skill list as a fallback.
- A custom `useResizeObserver` hook keeps the canvas dimensions in sync with its container.
- Adding new skills requires updating `skills.json` — the graph re-simulates automatically.
