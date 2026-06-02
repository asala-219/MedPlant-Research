import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Search, Filter, ChevronRight } from "lucide-react";
import { api, type Plant, type Condition } from "../../api/client";
import { useLang } from "../../i18n/LangContext";
import { t } from "../../i18n/translations";

const PAGE = 30;

export function DataTable() {
  const { lang } = useLang();
  const tr = t[lang];
  const navigate = useNavigate();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [familyFilter, setFamilyFilter] = useState("");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [families, setFamilies] = useState<string[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    api.conditions().then(setConditions).catch(console.error);
    api.plants({ limit: 200 }).then((r) => {
      const fams = Array.from(
        new Set(r.data.map((p) => p.family ?? "").filter(Boolean))
      ).sort();
      setFamilies(fams);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      api
        .plants({
          search: search || undefined,
          condition: conditionFilter || undefined,
          family: familyFilter || undefined,
          skip,
          limit: PAGE,
        })
        .then((r) => {
          setPlants((prev) => (skip === 0 ? r.data : [...prev, ...r.data]));
          setTotal(r.total);
        })
        .catch(() => setError(tr.error))
        .finally(() => setLoading(false));
    }, 250);
  }, [search, conditionFilter, familyFilter, skip]);

  function handleFilterChange(setter: (v: string) => void, v: string) {
    setter(v);
    setSkip(0);
    setPlants([]);
  }

  function sourceLabel(s: string | null) {
    if (!s) return "—";
    if (s.includes("Neelam")) return "Neelam";
    if (s.includes("Divakar")) return "Divakar";
    if (s.includes("Phyto")) return "Phyto";
    return s;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder={tr.search_placeholder}
            value={search}
            onChange={(e) => handleFilterChange(setSearch, e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
          <select
            className="pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 appearance-none"
            value={conditionFilter}
            onChange={(e) => handleFilterChange(setConditionFilter, e.target.value)}
          >
            <option value="">{tr.all_conditions}</option>
            {conditions.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name} ({c.plant_count})
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
          <select
            className="pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 appearance-none"
            value={familyFilter}
            onChange={(e) => handleFilterChange(setFamilyFilter, e.target.value)}
          >
            <option value="">{tr.all_families}</option>
            {families.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-stone-500">
        {tr.showing} {plants.length} {tr.of} {total} {tr.results}
      </p>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-stone-200 shadow-sm bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-xs uppercase tracking-wider">
            <tr>
              {[tr.col_plant, tr.col_local, tr.col_family, tr.col_part, tr.col_conditions, tr.col_compounds, tr.col_source, ""].map(
                (h, i) => (
                  <th key={i} className="px-5 py-3 text-start font-semibold text-stone-500 whitespace-nowrap">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {plants.map((p) => (
              <tr
                key={p.id}
                onClick={() => navigate(`/plant/${p.id}`)}
                className="group cursor-pointer hover:bg-emerald-50/50 transition-colors"
                title={tr.view_profile}
              >
                <td className="px-5 py-3.5 font-medium text-stone-900 italic whitespace-nowrap max-w-[200px]">
                  <span className="truncate block">{p.scientific_name}</span>
                </td>
                <td className="px-5 py-3.5 text-stone-700 whitespace-nowrap">
                  {p.local_name || "—"}
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap">
                  {p.family ? (
                    <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-md border border-emerald-100">
                      {p.family}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap text-xs">
                  {p.part_used || "—"}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1 max-w-[180px]">
                    {p.conditions.slice(0, 2).map((c) => (
                      <span key={c} className="inline-block bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full whitespace-nowrap border border-red-100">
                        {c}
                      </span>
                    ))}
                    {p.conditions.length > 2 && (
                      <span className="inline-block bg-stone-100 text-stone-500 text-xs px-2 py-0.5 rounded-full">
                        +{p.conditions.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-stone-500 whitespace-nowrap text-xs">
                  {p.compounds.length > 0 ? (
                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full border border-blue-100">
                      {p.compounds.length} cpd{p.compounds.length > 1 ? "s" : ""}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-5 py-3.5 whitespace-nowrap">
                  <span className="bg-stone-100 text-stone-600 text-xs px-2 py-0.5 rounded-full">
                    {sourceLabel(p.source)}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-end">
                  <ChevronRight className="inline-block w-4 h-4 text-stone-300 group-hover:text-emerald-600 transition-colors rtl:rotate-180" />
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-stone-400">{tr.loading}</td>
              </tr>
            )}
            {!loading && plants.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-stone-400">{tr.no_data}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {plants.length < total && !loading && (
        <div className="flex justify-center">
          <button
            onClick={() => setSkip((s) => s + PAGE)}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow"
          >
            {tr.load_more}
          </button>
        </div>
      )}
    </div>
  );
}
