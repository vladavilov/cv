"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { forceCollide, forceX, forceY } from "d3-force";
import { useReducedMotion } from "framer-motion";
import ForceGraph2D, {
  type ForceGraphMethods,
  type GraphData,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useResizeObserver } from "@/hooks/use-resize-observer";
import { cn } from "@/lib/utils";
import {
  getThemeColor,
  themeColorFallbacks,
  withAlpha,
  type ThemeColorToken,
} from "@/lib/theme-colors";
import type { SkillGraph, SkillLink, SkillNode } from "@/lib/types";

type GraphNode = SkillNode & {
  x?: number;
  y?: number;
};

type GraphNodeObject = NodeObject<GraphNode> & GraphNode;
type GraphLinkObject = LinkObject<GraphNode, SkillLink>;

type SkillGraphCanvasProps = {
  skillGraph: SkillGraph;
  activeFilter: string | null;
  hoveredSkill: string | null;
  onFilterChange: (skill: string) => void;
  onHoverChange: (skill: string | null) => void;
  onClearFilter: () => void;
};

const categoryTokens: Record<SkillNode["category"], ThemeColorToken> = {
  "AI & ML": "primary",
  Languages: "accentForeground",
  Frontend: "foregroundSoft",
  Backend: "mutedForeground",
  DevOps: "foregroundFaint",
};

function getNodeId(node: unknown) {
  if (node && typeof node === "object" && "id" in node) {
    return String(node.id ?? "");
  }

  return String(node ?? "");
}

function buildCanvasColors(resolve: (token: ThemeColorToken) => string) {
  return {
    categories: Object.fromEntries(
      Object.entries(categoryTokens).map(([category, token]) => [
        category,
        resolve(token),
      ]),
    ) as Record<SkillNode["category"], string>,
    activeNode: resolve("foreground"),
    label: withAlpha(resolve("foreground"), 0.85),
    link: withAlpha(resolve("foregroundFaint"), 0.2),
    linkDimmed: withAlpha(resolve("foregroundFaint"), 0.06),
  };
}

export function SkillGraphCanvas({
  skillGraph,
  activeFilter,
  hoveredSkill,
  onFilterChange,
  onHoverChange,
  onClearFilter,
}: SkillGraphCanvasProps) {
  const shouldReduceMotion = useReducedMotion();
  const graphRef = useRef<
    ForceGraphMethods<NodeObject<GraphNode>, LinkObject<GraphNode, SkillLink>> | undefined
  >(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useResizeObserver(containerRef);
  // Render stays pure: the initial value is built from the static fallback
  // constants, and getComputedStyle resolution happens once in an effect.
  // The fallbacks mirror the tokens, so the first frame is already correct.
  const [canvasColors, setCanvasColors] = useState(() =>
    buildCanvasColors((token) => themeColorFallbacks[token]),
  );

  useEffect(() => {
    setCanvasColors(buildCanvasColors(getThemeColor));
  }, []);
  const graphData = useMemo(
    () =>
      skillGraph as unknown as GraphData<GraphNodeObject, GraphLinkObject>,
    [skillGraph],
  );

  const neighborMap = useMemo(() => {
    const map = new Map<string, Set<string>>();

    skillGraph.nodes.forEach((node) => map.set(node.id, new Set([node.id])));
    skillGraph.links.forEach((link) => {
      const source = getNodeId(link.source);
      const target = getNodeId(link.target);

      map.get(source)?.add(target);
      map.get(target)?.add(source);
    });

    return map;
  }, [skillGraph.links, skillGraph.nodes]);

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    if (!graphRef.current) {
      return;
    }

    graphRef.current.d3Force(
      "collide",
      forceCollide<NodeObject<GraphNode>>((node) => {
        const currentNode = node as GraphNodeObject;

        return currentNode.val * 2.3;
      }),
    );
    graphRef.current.d3Force("x", forceX<NodeObject<GraphNode>>(0).strength(0.06));
    graphRef.current.d3Force("y", forceY<NodeObject<GraphNode>>(0).strength(0.06));
    graphRef.current.d3ReheatSimulation();
  }, [graphData, shouldReduceMotion]);

  if (shouldReduceMotion) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-foreground">
            Static skill map (reduced motion).
          </p>
          {activeFilter ? (
            <span className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-accent-foreground">
              {activeFilter}
            </span>
          ) : null}
        </div>
        <ToggleGroup
          value={activeFilter ? [activeFilter] : []}
          onValueChange={(groupValue) => {
            const nextFilter = groupValue[0];

            if (nextFilter) {
              onFilterChange(nextFilter);
            } else {
              // Toggling the pressed skill off deselects → clear the filter.
              onClearFilter();
            }
          }}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          {skillGraph.nodes.map((node) => (
            <ToggleGroupItem key={node.id} value={node.label} variant="card">
              <p className="text-sm font-medium text-foreground">{node.label}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.5px] text-muted-foreground">
                {node.category}
              </p>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "min-h-[420px] rounded-lg border border-border bg-card p-4 md:min-h-[500px] md:p-5",
        // Tactile affordance: nodes are clickable filters, so hovering one
        // must read as interactive.
        hoveredSkill && "cursor-pointer",
      )}
    >
      {width > 0 && height > 0 ? (
        <ForceGraph2D
          ref={graphRef}
          width={width - 8}
          height={height - 8}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={6}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={(link) => {
            const source = getNodeId(link.source);
            const target = getNodeId(link.target);
            const isActive =
              activeFilter !== null &&
              [source, target].some((id) => {
                const node = skillGraph.nodes.find((item) => item.id === id);
                return node?.label === activeFilter;
              });

            return isActive ? 1.7 : 0.8;
          }}
          linkDirectionalParticleSpeed={() => 0.005}
          linkWidth={(link) => {
            const source = getNodeId(link.source);
            const target = getNodeId(link.target);
            const hoveredNeighbors = hoveredSkill
              ? neighborMap.get(hoveredSkill) ?? new Set()
              : null;
            const isVisible =
              !hoveredNeighbors ||
              hoveredNeighbors.has(source) ||
              hoveredNeighbors.has(target);

            return isVisible ? 0.9 : 0.25;
          }}
          linkColor={(link) => {
            const source = getNodeId(link.source);
            const target = getNodeId(link.target);
            const hoveredNeighbors = hoveredSkill
              ? neighborMap.get(hoveredSkill) ?? new Set()
              : null;
            const isVisible =
              !hoveredNeighbors ||
              hoveredNeighbors.has(source) ||
              hoveredNeighbors.has(target);

            return isVisible ? canvasColors.link : canvasColors.linkDimmed;
          }}
          onNodeHover={(node) => {
            const currentNode = node as GraphNodeObject | null;

            // force-graph does not manage the cursor; make nodes feel clickable.
            if (containerRef.current) {
              containerRef.current.style.cursor = currentNode ? "pointer" : "";
            }

            onHoverChange(currentNode ? String(currentNode.id ?? "") : null);
          }}
          onNodeClick={(node) => {
            const id = getNodeId(node);
            const canonical = skillGraph.nodes.find((n) => n.id === id);
            const currentNode = node as GraphNodeObject;
            onFilterChange(canonical?.label ?? currentNode.label);
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const currentNode = node as GraphNodeObject;
            const neighbors = hoveredSkill
              ? neighborMap.get(hoveredSkill) ?? new Set()
              : null;
            const currentNodeId = String(currentNode.id ?? "");
            const isVisible = !neighbors || neighbors.has(currentNodeId);
            const isActive = activeFilter === currentNode.label;
            const isHovered = hoveredSkill === currentNodeId;
            const color = canvasColors.categories[currentNode.category];
            // Tactile hover: the pointed-at node grows slightly and glows a
            // touch brighter (this canvas path never renders under
            // prefers-reduced-motion — the static list replaces it).
            const radius = Math.max(currentNode.val, 6) * (isHovered ? 1.16 : 1);
            const fontSize = Math.max(12 / globalScale, 12);

            ctx.save();
            ctx.globalAlpha = isVisible ? 1 : 0.18;
            ctx.beginPath();
            ctx.fillStyle = isActive ? canvasColors.activeNode : color;
            ctx.shadowColor = color;
            ctx.shadowBlur = isActive ? 28 : isHovered ? 22 : 14;
            ctx.arc(currentNode.x ?? 0, currentNode.y ?? 0, radius, 0, 2 * Math.PI);
            ctx.fill();

            ctx.font = `500 ${fontSize}px Geist, sans-serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillStyle = isActive ? canvasColors.activeNode : canvasColors.label;
            ctx.shadowBlur = 0;
            ctx.fillText(
              currentNode.label,
              (currentNode.x ?? 0) + radius + 8,
              currentNode.y ?? 0,
            );
            ctx.restore();
          }}
          nodePointerAreaPaint={(node, color, ctx) => {
            const currentNode = node as GraphNodeObject;
            const radius = Math.max(currentNode.val, 6);
            const cx = currentNode.x ?? 0;
            const cy = currentNode.y ?? 0;
            const fontSize = 12;
            ctx.font = `500 ${fontSize}px Geist, sans-serif`;
            const labelWidth = ctx.measureText(currentNode.label).width;
            const left = cx - radius - 6;
            const right = cx + radius + 8 + labelWidth + 6;
            const top = cy - Math.max(radius, fontSize * 0.6) - 6;
            const bottom = cy + Math.max(radius, fontSize * 0.6) + 6;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.rect(left, top, right - left, bottom - top);
            ctx.fill();
          }}
        />
      ) : null}
    </div>
  );
}
