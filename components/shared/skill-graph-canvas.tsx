"use client";

import { useEffect, useMemo, useRef } from "react";
import { forceCollide, forceX, forceY } from "d3-force";
import { useReducedMotion } from "framer-motion";
import ForceGraph2D, {
  type ForceGraphMethods,
  type GraphData,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";

import { useResizeObserver } from "@/hooks/use-resize-observer";
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
};

const categoryColors: Record<SkillNode["category"], string> = {
  "AI & ML": "#c96442",
  Languages: "#d97757",
  Frontend: "#b0aea5",
  Backend: "#87867f",
  DevOps: "#5e5d59",
};

function getNodeId(node: unknown) {
  if (node && typeof node === "object" && "id" in node) {
    return String(node.id ?? "");
  }

  return String(node ?? "");
}

export function SkillGraphCanvas({
  skillGraph,
  activeFilter,
  hoveredSkill,
  onFilterChange,
  onHoverChange,
}: SkillGraphCanvasProps) {
  const shouldReduceMotion = useReducedMotion();
  const graphRef = useRef<
    ForceGraphMethods<NodeObject<GraphNode>, LinkObject<GraphNode, SkillLink>> | undefined
  >(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useResizeObserver(containerRef);
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
      <div className="rounded-lg border border-[#30302e] bg-[#30302e] p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-foreground">
            Static skill map (reduced motion).
          </p>
          {activeFilter ? (
            <span className="rounded-lg border border-[#c96442]/30 bg-[#c96442]/10 px-3 py-1 text-xs text-[#d97757]">
              {activeFilter}
            </span>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {skillGraph.nodes.map((node) => (
            <div
              key={node.id}
              className="rounded-lg border border-[#3d3d3a] bg-[#141413] p-4"
            >
              <p className="text-sm font-medium text-foreground">{node.label}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.5px] text-[#87867f]">
                {node.category}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-[420px] rounded-lg border border-[#30302e] bg-[#30302e] p-4 md:min-h-[500px] md:p-5"
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

            return isVisible ? "rgba(94,93,89,0.2)" : "rgba(94,93,89,0.06)";
          }}
          onNodeHover={(node) => {
            const currentNode = node as GraphNodeObject | null;
            onHoverChange(currentNode ? String(currentNode.id ?? "") : null);
          }}
          onNodeClick={(node) => {
            const currentNode = node as GraphNodeObject;
            onFilterChange(currentNode.label);
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const currentNode = node as GraphNodeObject;
            const neighbors = hoveredSkill
              ? neighborMap.get(hoveredSkill) ?? new Set()
              : null;
            const currentNodeId = String(currentNode.id ?? "");
            const isVisible = !neighbors || neighbors.has(currentNodeId);
            const isActive = activeFilter === currentNode.label;
            const color = categoryColors[currentNode.category];
            const radius = Math.max(currentNode.val, 6);
            const fontSize = Math.max(12 / globalScale, 12);

            ctx.save();
            ctx.globalAlpha = isVisible ? 1 : 0.18;
            ctx.beginPath();
            ctx.fillStyle = isActive ? "#faf9f5" : color;
            ctx.shadowColor = color;
            ctx.shadowBlur = isActive ? 28 : 14;
            ctx.arc(currentNode.x ?? 0, currentNode.y ?? 0, radius, 0, 2 * Math.PI);
            ctx.fill();

            ctx.font = `500 ${fontSize}px Geist, sans-serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillStyle = isActive ? "#faf9f5" : "rgba(250,249,245,0.85)";
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
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(
              currentNode.x ?? 0,
              currentNode.y ?? 0,
              Math.max(currentNode.val, 6) + 8,
              0,
              2 * Math.PI,
            );
            ctx.fill();
          }}
        />
      ) : null}
    </div>
  );
}
