import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ArrowLeft, Leaf, FlaskConical, Stethoscope, Network } from "lucide-react";
import { api, nodePath, type Plant, type GraphData, type GraphNode } from "../../api/client";
import { KnowledgeGraphViz, GraphLegend } from "../components/KnowledgeGraphViz";
import { PlantImageGallery } from "../components/PlantImageGallery";
import { useLang } from "../../i18n/LangContext";
import { t } from "../../i18n/translations";
import { familyName, localName, partUsed, pickList } from "../../i18n/dataset";

export function PlantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang } = useLang();
  const tr = t[lang];

  function handleNodeClick(node: GraphNode) {
    // Don't re-navigate to the plant we're already viewing.
    if (node.type === "Plant" && String(node.db_id) === id) return;
    const path = nodePath(node);
    if (path) navigate(path);
  }

  const [plant, setPlant] = useState<Plant | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!id) return;
    const numId = parseInt(id, 10);

    setLoading(true);
    Promise.all([
      api.plant(numId),
      // Depth 1 = this plant's own conditions/compounds/family only.
      // Depth 2 explodes through hub conditions into an unreadable hairball.
      api.plantGraph(numId, 1),
    ])
      .then(([p, g]) => {
        setPlant(p);
        setGraph(g);
      })
      .catch(() => setError(tr.error))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-24 text-center text-stone-400">
        {tr.loading}
      </main>
    );
  }

  if (error || !plant) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-24 text-center flex flex-col items-center gap-6">
        <Leaf className="w-12 h-12 text-stone-200" />
        <p className="text-stone-500">{error || tr.plant_not_found}</p>
        <Link to="/" className="text-emerald-600 font-semibold hover:underline">{tr.back}</Link>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 pb-24">
      {/* Back */}
      <Link
        to="/"
        aria-label={tr.back}
        title={tr.back}
        className="inline-flex items-center text-stone-500 hover:text-emerald-700 mb-8 group"
      >
        <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center group-hover:border-emerald-200 group-hover:bg-emerald-50 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </div>
      </Link>

      {/* Header */}
      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full mb-4">
          <Leaf className="w-3.5 h-3.5" />
          {tr.plant_detail_title}
        </span>
        <h1 className="text-4xl md:text-5xl font-serif font-bold italic text-stone-900 tracking-tight mb-2">
          {plant.scientific_name}
        </h1>
        {plant.local_name && (
          <p className="text-2xl text-stone-500">
            {tr.local}: <strong className="text-stone-800">{localName(lang, plant)}</strong>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick facts */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Plant image gallery */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
            <PlantImageGallery
              images={plant.images?.length ? plant.images : (plant.image_url ? [plant.image_url] : [])}
              alt={plant.scientific_name}
            />
          </div>

          {/* Quick reference card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-4">{tr.plant_quick_reference}</h3>
            <dl className="space-y-3 text-sm">
              {[
                { label: tr.family, value: familyName(lang, plant) },
                { label: tr.part_used, value: partUsed(lang, plant) },
                { label: tr.source, value: plant.source },
              ].map(({ label, value }) =>
                value ? (
                  <div key={label} className={label === tr.source ? "flex min-w-0 flex-col gap-1" : "flex min-w-0 justify-between gap-2"}>
                    <dt className="text-stone-500">{label}</dt>
                    <dd className="min-w-0 break-words font-semibold leading-relaxed text-stone-800 text-end">{value}</dd>
                  </div>
                ) : null
              )}
            </dl>
          </div>

          {/* Conditions */}
          {plant.conditions.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className="w-4 h-4 text-red-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">{tr.conditions_treated}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {pickList(lang, plant.conditions, plant.conditions_ar).map((c) => (
                  <span key={c} className="bg-red-50 text-red-700 border border-red-100 text-xs px-3 py-1.5 rounded-full font-medium">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Related plants */}
          {plant.related_plants && plant.related_plants.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">{tr.related_plants}</h3>
              <ul className="space-y-2">
                {plant.related_plants.slice(0, 6).map((r) => (
                  <li key={r.id}>
                    <Link
                      to={`/plant/${r.id}`}
                      className="text-sm text-emerald-700 italic hover:underline"
                    >
                      {r.scientific_name}
                    </Link>
                    {r.local_name && (
                      <span className="text-stone-400 text-xs ml-1">({localName(lang, r)})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: Main content */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Traditional use */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.04] pointer-events-none">
              <Stethoscope className="w-32 h-32" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-serif font-bold text-stone-900">{tr.traditional_use}</h2>
            </div>
            <p className="text-stone-700 leading-relaxed">
              {(lang === "ar" ? plant.traditional_use_ar : plant.traditional_use) || tr.no_data}
            </p>
          </div>

          {/* Compounds */}
          {plant.compounds.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-[0.04] pointer-events-none">
                <FlaskConical className="w-32 h-32" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-serif font-bold text-stone-900">
                  {tr.phytochemicals}
                  <span className="ms-2 text-sm font-normal text-stone-400">({plant.compounds.length})</span>
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {plant.compounds.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-lg"
                    title={c.imppat_id ?? undefined}
                  >
                    <span className="font-mono text-stone-700 text-xs font-semibold">{c.name}</span>
                    {c.imppat_id && (
                      <span className="text-blue-400 text-xs">({c.imppat_id})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plant graph */}
          {graph && graph.nodes.length > 1 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-serif font-bold text-stone-900">{tr.relationship_graph}</h2>
                  <p className="text-xs text-stone-400">
                    <span className="italic">{plant.scientific_name}</span> — {tr.plant_relationship_subtitle}
                  </p>
                </div>
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
