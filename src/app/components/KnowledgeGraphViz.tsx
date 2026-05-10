import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import type { GraphData, GraphNode, GraphEdge } from "../../api/client";
import { useLang } from "../../i18n/LangContext";
import { t } from "../../i18n/translations";

// ---------------------------------------------------------------------------
// Colour palette by node type
// ---------------------------------------------------------------------------
const COLOR: Record<string, string> = {
  Plant:     "#10b981",  // emerald-500
  Condition: "#ef4444",  // red-500
  Compound:  "#3b82f6",  // blue-500
  Family:    "#f59e0b",  // amber-500
};

const RADIUS: Record<string, number> = {
  Plant:     10,
  Condition: 14,
  Compound:  7,
  Family:    12,
};

// ---------------------------------------------------------------------------
// D3 force simulation types
// ---------------------------------------------------------------------------
interface SimNode extends d3.SimulationNodeDatum, GraphNode {}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  type: string;
}

interface Props {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  height?: number;
}

export function KnowledgeGraphViz({ data, onNodeClick, height = 560 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { lang } = useLang();
  const tr = t[lang];

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 900;
    const h = height;

    // zoom layer
    const g = svg.append("g");

    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 6])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

    // Prepare simulation data (deep clone to avoid mutations)
    const nodes: SimNode[] = data.nodes.map((n) => ({ ...n }));
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    const links: SimLink[] = data.edges
      .map((e) => ({
        source: nodeById.get(e.source) ?? e.source,
        target: nodeById.get(e.target) ?? e.target,
        type: e.type,
      }))
      .filter((e) => typeof e.source === "object" && typeof e.target === "object");

    // Simulation
    const sim = d3.forceSimulation<SimNode>(nodes)
      .force("link", d3.forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(60).strength(0.6))
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, h / 2))
      .force("collision", d3.forceCollide<SimNode>().radius((d) => RADIUS[d.type] + 4));

    // Links
    const link = g.append("g")
      .attr("stroke-opacity", 0.4)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) =>
        d.type === "TREATS" ? "#ef4444"
        : d.type === "CONTAINS" ? "#3b82f6"
        : d.type === "BELONGS_TO" ? "#f59e0b"
        : "#94a3b8"
      )
      .attr("stroke-width", (d) => (d.type === "TREATS" ? 2 : 1));

    // Nodes
    const node = g.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => RADIUS[d.type] ?? 8)
      .attr("fill", (d) => COLOR[d.type] ?? "#94a3b8")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("click", (_event, d) => onNodeClick?.(d))
      .call(
        d3.drag<SVGCircleElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on("end", (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      );

    // Labels — only for Plants, Conditions, Families (too many Compounds)
    const label = g.append("g")
      .selectAll("text")
      .data(nodes.filter((n) => n.type !== "Compound"))
      .join("text")
      .text((d) => (d.label.length > 22 ? d.label.slice(0, 20) + "…" : d.label))
      .attr("font-size", (d) => (d.type === "Condition" ? 11 : 9))
      .attr("dy", (d) => -(RADIUS[d.type] + 3))
      .attr("text-anchor", "middle")
      .attr("fill", "#1c1917")
      .attr("pointer-events", "none")
      .style("user-select", "none");

    // Tooltip
    const tooltip = d3.select("body")
      .append("div")
      .style("position", "fixed")
      .style("background", "rgba(0,0,0,0.85)")
      .style("color", "#fff")
      .style("padding", "6px 10px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("display", "none")
      .style("z-index", "9999")
      .style("max-width", "220px");

    node
      .on("mouseover", (event, d) => {
        tooltip
          .style("display", "block")
          .html(
            `<strong>${d.label}</strong>` +
            (d.local_name ? `<br/><em>${d.local_name}</em>` : "") +
            `<br/><span style="opacity:.7">${d.type}</span>`
          );
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.clientX + 12 + "px")
          .style("top", event.clientY - 28 + "px");
      })
      .on("mouseout", () => tooltip.style("display", "none"));

    sim.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);

      node.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
      label.attr("x", (d) => d.x ?? 0).attr("y", (d) => d.y ?? 0);
    });

    return () => {
      sim.stop();
      tooltip.remove();
    };
  }, [data, height, onNodeClick]);

  return (
    <svg
      ref={svgRef}
      className="w-full rounded-xl border border-stone-200 bg-stone-50"
      style={{ height }}
    />
  );
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------
export function GraphLegend() {
  const { lang } = useLang();
  const tr = t[lang];
  const items = [
    { type: "Plant",     label: tr.node_plant },
    { type: "Condition", label: tr.node_condition },
    { type: "Compound",  label: tr.node_compound },
    { type: "Family",    label: tr.node_family },
  ];
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      {items.map(({ type, label }) => (
        <div key={type} className="flex items-center gap-1.5">
          <span
            className="inline-block rounded-full"
            style={{ width: 12, height: 12, background: COLOR[type] }}
          />
          <span className="text-stone-600">{label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 ms-4">
        <span className="inline-block h-0.5 w-6 bg-red-400" />
        <span className="text-stone-500">TREATS</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-6 bg-blue-400" />
        <span className="text-stone-500">CONTAINS</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-6 bg-amber-400" />
        <span className="text-stone-500">BELONGS_TO</span>
      </div>
    </div>
  );
}
