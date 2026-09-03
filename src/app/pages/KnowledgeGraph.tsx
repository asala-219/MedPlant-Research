import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { Search } from "lucide-react";
import { api, nodePath, type GraphData, type GraphNode, type Condition } from "../../api/client";
import { KnowledgeGraphViz, GraphLegend } from "../components/KnowledgeGraphViz";
import { useLang } from "../../i18n/LangContext";
import { t } from "../../i18n/translations";
import { localName, nodeLabel } from "../../i18n/dataset";

type ViewMode = "full" | "plants_conditions" | "plants_compounds" | "search";

export function KnowledgeGraph() {
  const { lang } = useLang();
  const tr = t[lang];
  const navigate = useNavigate();

  const [graph, setGraph] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState<ViewMode>("plants_conditions");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [stats, setStats] = useState<{ total_nodes: number; total_edges: number; nodes_by_type: Record<string, number>; edges_by_type: Record<string, number> } | null>(null);
  const nodeTypeLabel = (type: string) => {
    if (type === "Plant") return tr.node_plant;
    if (type === "Condition") return tr.node_condition;
    if (type === "Compound") return tr.node_compound;
    if (type === "Family") return tr.node_family;
    return type;
  };
  const edgeTypeLabel = (type: string) => {
    if (type === "TREATS") return tr.graph_edge_treats;
    if (type === "CONTAINS") return tr.graph_edge_contains;
    if (type === "BELONGS_TO") return tr.graph_edge_belongs_to;
    return type;
  };

  useEffect(() => {
    api.conditions().then(setConditions).catch(console.error);
    api.graphStats().then(setStats).catch(console.error);
  }, []);

  useEffect(() => {
    if (mode === "search") return;
    setLoading(true);
    let req: Promise<GraphData>;

    if (mode === "plants_conditions") {
      req = api.fullGraph("Plant,Condition");
    } else if (mode === "plants_compounds") {
      req = api.fullGraph("Plant,Compound");
    } else {
      req = api.fullGraph();
    }

    req
      .then(setGraph)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [mode]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (!q.trim()) return;
    setLoading(true);
    api.graphSearch(q)
      .then((g) => {
        setGraph(g);
        setMode("search");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleConditionClick(condId: number) {
    setLoading(true);
    api.conditionGraph(condId)
      .then((g) => {
        setGraph(g);
        setMode("search");
        setSelectedNode(null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  function handleNodeClick(node: GraphNode) {
    setSelectedNode(node);
    // IMPPAT-style: clicking a node opens its dedicated detail page showing
    // everything we hold about that entity. Falls back to in-graph focus when
    // the node has no resolvable detail route.
    const path = nodePath(node);
    if (path) {
      navigate(path);
    }
  }

  const modeBtn = (m: ViewMode, label: string) => (
    <button
      onClick={() => { setMode(m); setSearchQuery(""); setSelectedNode(null); }}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        mode === m
          ? "bg-emerald-600 text-white shadow"
          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-10 pb-24">
      <div className="mb-6">
        <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-emerald-600 mb-1">
          {tr.graph_phase_label}
        </h2>
        <h1 className="text-4xl font-serif font-bold text-stone-900">{tr.graph_title}</h1>
        <p className="text-stone-500 mt-2 max-w-2xl">{tr.graph_subtitle}</p>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="flex flex-wrap gap-4 mb-6">
          {Object.entries(stats.nodes_by_type).map(([type, count]) => (
            <div key={type} className="bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm shadow-sm">
              <span className="font-bold text-stone-800">{count.toLocaleString()}</span>
              <span className="text-stone-500 ms-1.5">{nodeTypeLabel(type)} {tr.graph_nodes_suffix}</span>
            </div>
          ))}
          {Object.entries(stats.edges_by_type).map(([type, count]) => (
            <div key={type} className="bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm shadow-sm">
              <span className="font-bold text-stone-800">{count.toLocaleString()}</span>
              <span className="text-stone-500 ms-1.5">{edgeTypeLabel(type)} {tr.graph_edges_suffix}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-72 flex flex-col gap-4 shrink-0">
          {/* Search */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 block">
              {tr.graph_search_placeholder}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder={tr.graph_search_placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery)}
              />
            </div>
            <button
              onClick={() => handleSearch(searchQuery)}
              className="mt-2 w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              {tr.graph_search_button}
            </button>
          </div>

          {/* View mode */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">{tr.graph_view_label}</p>
            <div className="flex flex-col gap-2">
              {modeBtn("plants_conditions", tr.show_plants_conditions)}
              {modeBtn("plants_compounds", tr.show_plants_compounds)}
              {modeBtn("full", tr.show_full)}
            </div>
          </div>

          {/* Conditions quicklinks */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">{tr.graph_browse_condition_label}</p>
            <ul className="space-y-1 max-h-64 overflow-y-auto">
              {conditions.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => handleConditionClick(c.id)}
                    className="w-full text-start text-sm text-stone-700 hover:text-emerald-700 py-1 px-2 rounded-lg hover:bg-emerald-50 transition-colors flex justify-between items-center"
                  >
                    <span>{lang === "ar" ? c.name_ar : c.name}</span>
                    <span className="text-xs text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">{c.plant_count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Selected node panel */}
          {selectedNode && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">{tr.graph_selected_node_label}</p>
              <p className="font-semibold text-stone-900 text-sm">{nodeLabel(lang, selectedNode)}</p>
              {selectedNode.local_name && (
                <p className="text-stone-500 text-xs mt-1">{localName(lang, selectedNode)}</p>
              )}
              <span className="inline-block mt-2 text-xs bg-white border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full">
                {nodeTypeLabel(selectedNode.type)}
              </span>
              {selectedNode.type === "Plant" && selectedNode.db_id && (
                <Link
                  to={`/plant/${selectedNode.db_id}`}
                  className="block mt-3 text-xs text-emerald-700 font-semibold hover:underline"
                >
                  {tr.graph_open_plant_profile}
                </Link>
              )}
            </div>
          )}
        </aside>

        {/* Graph panel */}
        <div className="flex-1 flex flex-col gap-3">
          <p className="text-xs text-stone-400">{tr.graph_tip}</p>
          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-stone-200 bg-stone-50" style={{ height: 560 }}>
              <p className="text-stone-400">{tr.loading}</p>
            </div>
          ) : (
            <KnowledgeGraphViz data={graph} height={560} onNodeClick={handleNodeClick} />
          )}
          <GraphLegend />
          <p className="text-xs text-stone-400">
            {tr.showing} {graph.nodes.length} {tr.graph_nodes_suffix} {tr.of} {graph.edges.length} {tr.graph_edges_suffix}
            {mode === "search" && ` · ${tr.graph_search_subgraph}`}
          </p>
        </div>
      </div>
    </main>
  );
}
