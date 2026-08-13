import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { GraphData, GraphNode } from "../../api/client";
import { useLang } from "../../i18n/LangContext";
import { t } from "../../i18n/translations";

// Font Awesome unicode codepoints (Solid, weight 900)
const FA_ICON: Record<string, string> = {
  Plant:     "",  // fa-leaf
  Family:    "",  // fa-circle-nodes
  Condition: "",  // fa-stethoscope
};

// ---------------------------------------------------------------------------
// Colour palette by node type
// ---------------------------------------------------------------------------
const COLOR: Record<string, string> = {
  Plant:     "#10b981",  // emerald-500
  Condition: "#ef4444",  // red-500
  Compound:  "#3b82f6",  // blue-500
  Family:    "#f59e0b",  // amber-500
};

// Base radius per type; final radius also grows with the node's degree so
// well-connected hubs (popular conditions, families) read as bigger.
const BASE_RADIUS: Record<string, number> = {
  Plant:     7,
  Condition: 10,
  Compound:  5,
  Family:    9,
};

// ---------------------------------------------------------------------------
// D3 force simulation types
// ---------------------------------------------------------------------------
interface SimNode extends d3.SimulationNodeDatum, GraphNode {
  _deg?: number;
  _r?: number;
}

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
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 6])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    // ── Prepare data ────────────────────────────────────────────────────
    const nodes: SimNode[] = data.nodes.map((n) => ({ ...n }));
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    const links: SimLink[] = data.edges
      .map((e) => ({
        source: nodeById.get(e.source) ?? e.source,
        target: nodeById.get(e.target) ?? e.target,
        type: e.type,
      }))
      .filter((e) => typeof e.source === "object" && typeof e.target === "object");

    // Degree + adjacency (used for sizing, labelling and hover focus)
    const degree = new Map<string, number>();
    const neighbors = new Map<string, Set<string>>();
    nodes.forEach((n) => { degree.set(n.id, 0); neighbors.set(n.id, new Set()); });
    data.edges.forEach((e) => {
      if (!nodeById.has(e.source) || !nodeById.has(e.target)) return;
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
      neighbors.get(e.source)!.add(e.target);
      neighbors.get(e.target)!.add(e.source);
    });

    const maxDeg = Math.max(1, ...degree.values());
    const sizeScale = d3.scaleSqrt().domain([0, maxDeg]).range([0, 13]);
    nodes.forEach((n) => {
      n._deg = degree.get(n.id) ?? 0;
      n._r = (BASE_RADIUS[n.type] ?? 6) + sizeScale(n._deg);
    });

    // ── Which labels to show by default? ────────────────────────────────
    // Always label the orienting hubs (Conditions, Families). For plants we
    // only label the most connected few (or all if the graph is small) and we
    // never clutter with compound labels. The rest appear on hover.
    const plantNodes = nodes.filter((n) => n.type === "Plant");
    const showAllPlants = plantNodes.length <= 22;
    const topPlantIds = new Set(
      [...plantNodes]
        .sort((a, b) => (b._deg ?? 0) - (a._deg ?? 0))
        .slice(0, 12)
        .map((n) => n.id)
    );
    const defaultLabel = (n: SimNode) =>
      n.type === "Condition" ||
      n.type === "Family" ||
      (n.type === "Plant" && (showAllPlants || topPlantIds.has(n.id)));

    // ── Simulation (spacing scales with graph size) ─────────────────────
    // Smaller graphs get MUCH stronger repulsion + longer links so the few
    // nodes spread out and their labels are readable; large graphs stay
    // compact enough to fit. Centering pull is kept weak so nodes don't
    // collapse into the middle.
    const n = nodes.length;
    const charge =
      n <= 30 ? -650 :
      n <= 80 ? -380 :
      n <= 150 ? -240 : -170;
    const linkDist =
      n <= 30 ? 120 :
      n <= 80 ? 90 :
      n <= 150 ? 72 : 60;
    const centerStrength = n <= 80 ? 0.02 : 0.05;
    const sim = d3.forceSimulation<SimNode>(nodes)
      .force("link", d3.forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(linkDist).strength(0.35))
      .force("charge", d3.forceManyBody().strength(charge).distanceMax(420))
      .force("center", d3.forceCenter(width / 2, h / 2))
      .force("x", d3.forceX(width / 2).strength(centerStrength))
      .force("y", d3.forceY(h / 2).strength(centerStrength))
      .force("collision", d3.forceCollide<SimNode>().radius((d) => (d._r ?? 7) + 14).strength(0.9));

    // ── Links ───────────────────────────────────────────────────────────
    const linkColor = (type: string) =>
      type === "TREATS" ? "#ef4444"
      : type === "CONTAINS" ? "#3b82f6"
      : type === "BELONGS_TO" ? "#f59e0b"
      : type === "CO_TREATS" ? "#8b5cf6"
      : type === "SHARES_COMPOUND" ? "#14b8a6"
      : "#94a3b8";

    const baseLinkOpacity = nodes.length > 120 ? 0.18 : 0.35;
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => linkColor(d.type))
      .attr("stroke-opacity", baseLinkOpacity)
      .attr("stroke-dasharray", (d) =>
        d.type === "CO_TREATS" || d.type === "SHARES_COMPOUND" ? "4 3" : null
      )
      .attr("stroke-width", (d) => (d.type === "TREATS" ? 1.5 : 1));

    // ── Nodes ───────────────────────────────────────────────────────────
    const node = g.append("g")
      .selectAll<SVGCircleElement, SimNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => d._r ?? 7)
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

    // ── Labels (all rendered; visibility toggled for clarity) ───────────
    const label = g.append("g")
      .selectAll<SVGTextElement, SimNode>("text")
      .data(nodes.filter((n) => n.type !== "Compound"))
      .join("text")
      .text((d) => (d.label.length > 24 ? d.label.slice(0, 22) + "…" : d.label))
      .attr("font-size", (d) => (d.type === "Condition" ? 11 : 9))
      .attr("font-weight", (d) => (d.type === "Condition" || d.type === "Family" ? 600 : 400))
      .attr("dy", (d) => -((d._r ?? 7) + 3))
      .attr("text-anchor", "middle")
      .attr("fill", "#1c1917")
      .attr("paint-order", "stroke")
      .attr("stroke", "#FBFBF9")
      .attr("stroke-width", 3)
      .attr("pointer-events", "none")
      .style("user-select", "none")
      .style("opacity", (d) => (defaultLabel(d) ? 1 : 0));

    // ── FA icons (rendered on top of circles for typed nodes) ───────────
    const iconText = g.append("g")
      .selectAll<SVGTextElement, SimNode>("text.fa-icon")
      .data(nodes.filter((n) => n.type !== "Compound"))
      .join("text")
      .text((d) => FA_ICON[d.type] ?? "")
      .attr("font-family", "'Font Awesome 6 Free'")
      .attr("font-weight", 900)
      .attr("font-size", (d) => Math.max(8, (d._r ?? 7) * 1.0))
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "#fff")
      .attr("pointer-events", "none")
      .style("user-select", "none");

    // ── Hover focus: spotlight a node and its direct neighbours ─────────
    function focusNode(d: SimNode) {
      const keep = neighbors.get(d.id) ?? new Set<string>();
      const isVisible = (id: string) => id === d.id || keep.has(id);
      node.style("opacity", (n) => (isVisible(n.id) ? 1 : 0.12));
      iconText.style("opacity", (n) => (isVisible(n.id) ? 1 : 0.12));
      link
        .style("stroke-opacity", (l) => {
          const s = (l.source as SimNode).id, tg = (l.target as SimNode).id;
          return s === d.id || tg === d.id ? 0.9 : 0.03;
        })
        .attr("stroke-width", (l) => {
          const s = (l.source as SimNode).id, tg = (l.target as SimNode).id;
          return s === d.id || tg === d.id ? 2 : 1;
        });
      label.style("opacity", (n) => (isVisible(n.id) ? 1 : 0));
    }
    function clearFocus() {
      node.style("opacity", 1);
      iconText.style("opacity", 1);
      link
        .style("stroke-opacity", baseLinkOpacity)
        .attr("stroke-width", (l) => ((l as SimLink).type === "TREATS" ? 1.5 : 1));
      label.style("opacity", (d) => (defaultLabel(d) ? 1 : 0));
    }

    // ── Tooltip ─────────────────────────────────────────────────────────
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
        focusNode(d);
        tooltip
          .style("display", "block")
          .html(
            `<strong>${d.label}</strong>` +
            (d.local_name ? `<br/><em>${d.local_name}</em>` : "") +
            `<br/><span style="opacity:.7">${d.type} · ${d._deg ?? 0} link${(d._deg ?? 0) === 1 ? "" : "s"}</span>`
          );
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.clientX + 12 + "px")
          .style("top", event.clientY - 28 + "px");
      })
      .on("mouseout", () => {
        clearFocus();
        tooltip.style("display", "none");
      });

    sim.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);

      node.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
      label.attr("x", (d) => d.x ?? 0).attr("y", (d) => d.y ?? 0);
      iconText.attr("x", (d) => d.x ?? 0).attr("y", (d) => d.y ?? 0);
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
export function GraphLegend({ compact = false }: { compact?: boolean }) {
  const { lang } = useLang();
  const tr = t[lang];
  const items = [
    { type: "Plant",     label: tr.node_plant,     icon: "fa-solid fa-leaf" },
    { type: "Condition", label: tr.node_condition,  icon: "fa-solid fa-stethoscope" },
    { type: "Compound",  label: tr.node_compound,   icon: null },
    { type: "Family",    label: tr.node_family,     icon: "fa-solid fa-circle-nodes" },
  ];
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${compact ? "text-xs" : "text-sm"}`}>
      {items.map(({ type, label, icon }) => (
        <div key={type} className="flex items-center gap-1.5">
          {icon ? (
            <i className={icon} style={{ color: COLOR[type], fontSize: compact ? 11 : 13 }} />
          ) : (
            <span
              className="inline-block rounded-full"
              style={{ width: 11, height: 11, background: COLOR[type] }}
            />
          )}
          <span className="text-stone-600">{label}</span>
        </div>
      ))}
      {!compact && (
        <>
          <div className="flex items-center gap-1.5 ms-2">
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
        </>
      )}
    </div>
  );
}
