import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ArrowLeft, Stethoscope, Leaf, FlaskConical, Network } from "lucide-react";
import {
  api,
  nodePath,
  type ConditionDetail as ConditionDetailData,
  type GraphData,
  type GraphNode,
} from "../../api/client";
import { KnowledgeGraphViz, GraphLegend } from "../components/KnowledgeGraphViz";
import { useLang } from "../../i18n/LangContext";
import { t } from "../../i18n/translations";

export function ConditionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang } = useLang();
  const tr = t[lang];

  const [data, setData] = useState<ConditionDetailData | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!id) return;
    const numId = parseInt(id, 10);
    setLoading(true);
    Promise.all([api.condition(numId), api.conditionGraph(numId)])
      .then(([d, g]) => {
        setData(d);
        setGraph(g);
      })
      .catch(() => setError(tr.error))
      .finally(() => setLoading(false));
  }, [id]);

  function handleNodeClick(node: GraphNode) {
    const path = nodePath(node);
    if (path) navigate(path);
  }

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-24 text-center text-stone-400">
        {tr.loading}
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-24 text-center flex flex-col items-center gap-6">
        <Stethoscope className="w-12 h-12 text-stone-200" />
        <p className="text-stone-500">{error || tr.not_found}</p>
        <Link to="/graph" className="text-emerald-600 font-semibold hover:underline">{tr.back}</Link>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 pb-24">
      <Link
        to="/graph"
        aria-label={tr.back}
        title={tr.back}
        className="inline-flex items-center text-stone-500 hover:text-emerald-700 mb-8 group"
      >
        <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center group-hover:border-emerald-200 group-hover:bg-emerald-50 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </div>
      </Link>

      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full mb-4">
          <Stethoscope className="w-3.5 h-3.5" />
          {tr.condition_detail_title}
        </span>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 tracking-tight mb-2">
          {data.name}
        </h1>
        <p className="text-stone-500">
          <strong className="text-stone-800">{data.plant_count}</strong> {tr.plant_count_label}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: associated compounds */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {data.compounds.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <FlaskConical className="w-4 h-4 text-blue-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  {tr.associated_compounds}
                  <span className="ms-1.5 font-normal">({data.compounds.length})</span>
                </h3>
              </div>
              <div className="flex flex-wrap gap-2 max-h-80 overflow-y-auto">
                {data.compounds.map((c) => (
                  <Link
                    key={c.id}
                    to={`/compound/${c.id}`}
                    className="bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: plants treating + graph */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Leaf className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-serif font-bold text-stone-900">{tr.plants_treating}</h2>
            </div>
            <ul className="divide-y divide-stone-100">
              {data.plants.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/plant/${p.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 group"
                  >
                    <span>
                      <span className="font-serif italic text-stone-800 group-hover:text-emerald-700">{p.scientific_name}</span>
                      {p.local_name && <span className="text-stone-400 text-sm ms-2">({p.local_name})</span>}
                    </span>
                    {p.family && <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full shrink-0">{p.family}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {graph && graph.nodes.length > 1 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Network className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-serif font-bold text-stone-900">{tr.relationship_graph}</h2>
              </div>
              <KnowledgeGraphViz data={graph} height={360} onNodeClick={handleNodeClick} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <GraphLegend compact />
                <p className="text-xs text-stone-400">{tr.graph_tip}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
