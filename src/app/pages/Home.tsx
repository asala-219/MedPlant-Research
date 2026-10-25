import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { Leaf, Network, MessageSquare, Database, FlaskConical, Stethoscope, BarChart2, Globe } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { StatCard } from "../components/StatCard";
import { api, type StatsData } from "../../api/client";
import { useLang } from "../../i18n/LangContext";
import { fillStatsTemplate, t, type Lang } from "../../i18n/translations";

function formatStat(n: number, lang: Lang): string {
  return n.toLocaleString(lang === "ar" ? "ar-OM" : "en");
}

type FeatureItem = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
  to?: string;
};

export function Home() {
  const { lang } = useLang();
  const tr = t[lang];
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.stats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, []);

  const heroDesc = stats
    ? fillStatsTemplate(
        tr.hero_desc,
        { plants: stats.plants, compounds: stats.compounds, conditions: stats.conditions },
        lang,
      )
    : tr.hero_desc_loading;

  const feat1Desc = stats
    ? fillStatsTemplate(tr.feat1_desc, { plants: stats.plants }, lang)
    : tr.feat1_desc_loading;

  const features: FeatureItem[] = [
    { icon: <Database className="w-6 h-6" />, title: tr.feat1_title, desc: feat1Desc, color: "emerald", to: "/#database" },
    { icon: <Network className="w-6 h-6" />, title: tr.feat2_title, desc: tr.feat2_desc, color: "purple", to: "/graph" },
    { icon: <MessageSquare className="w-6 h-6" />, title: tr.feat3_title, desc: tr.feat3_desc, color: "blue", to: "/chat" },
    { icon: <Globe className="w-6 h-6" />, title: tr.feat4_title, desc: tr.feat4_desc, color: "amber" },
  ];

  const fc: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
  };

  const topConditionMax = useMemo(() => {
    if (!stats?.top_conditions.length) return 0;
    return Math.max(...stats.top_conditions.map((c) => c.count));
  }, [stats]);

  const featureCardClass =
    "group bg-white border border-stone-200 rounded-2xl p-6 hover:border-emerald-300 hover:shadow-md transition-all";

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-12 pb-24">
      {/* Hero */}
      <section id="about" className="mb-16">
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-stone-900 to-stone-950 rounded-3xl px-8 py-14 md:px-14">
          <div className="absolute inset-0 opacity-[0.06]" style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, #10b981 0%, transparent 60%), radial-gradient(circle at 80% 20%, #6366f1 0%, transparent 50%)",
          }} />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-5">
              <Leaf className="w-3.5 h-3.5" />
              MedPlant
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white leading-tight mb-4">
              {tr.hero_title}
            </h1>
            <p className="text-stone-300 text-lg leading-relaxed mb-8 max-w-2xl">{heroDesc}</p>
            <div className="flex flex-wrap gap-3">
              <a href="#database" className="inline-flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-400 transition-colors">
                <Database className="w-4 h-4" />{tr.nav_database}
              </a>
              <Link to="/graph" className="inline-flex items-center gap-2 bg-white/10 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-white/20 border border-white/20 transition-colors">
                <Network className="w-4 h-4" />{tr.nav_graph}
              </Link>
              <Link to="/chat" className="inline-flex items-center gap-2 bg-white/10 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-white/20 border border-white/20 transition-colors">
                <MessageSquare className="w-4 h-4" />{tr.nav_chat}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <section className="mb-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard value={formatStat(stats.plants, lang)} label={tr.stat_plants} icon={<Leaf className="w-5 h-5" />} accent="emerald" />
            <StatCard value={formatStat(stats.compounds, lang)} label={tr.stat_compounds} icon={<FlaskConical className="w-5 h-5" />} accent="blue" />
            <StatCard value={formatStat(stats.conditions, lang)} label={tr.stat_conditions} icon={<Stethoscope className="w-5 h-5" />} accent="red" />
            <StatCard value={formatStat(stats.families, lang)} label={tr.stat_families} icon={<Leaf className="w-5 h-5" />} accent="amber" />
            <StatCard value={formatStat(stats.plant_condition_links, lang)} label={tr.stat_condition_links} icon={<Network className="w-5 h-5" />} accent="purple" />
            <StatCard value={formatStat(stats.plant_compound_links, lang)} label={tr.stat_compound_links} icon={<BarChart2 className="w-5 h-5" />} accent="teal" />
          </div>
        </section>
      )}

      {/* Features */}
      <section id="features" className="mb-16">
        <h2 className="text-3xl font-serif font-bold text-stone-900 mb-2">{tr.home_platform_features_title}</h2>
        <p className="text-stone-500 mb-8 max-w-2xl">{tr.home_platform_features_subtitle}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(({ icon, title, desc, color, to }) => {
            const inner = (
              <>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${fc[color]}`}>{icon}</div>
                <h3 className="font-bold text-stone-900 mb-2 group-hover:text-emerald-700 transition-colors">{title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
              </>
            );
            return to ? (
              <Link key={title} to={to} className={featureCardClass}>
                {inner}
              </Link>
            ) : (
              <div key={title} className={`${featureCardClass} cursor-default`}>
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {/* Top conditions chart */}
      {stats && stats.top_conditions.length > 0 && topConditionMax > 0 && (
        <section className="mb-16">
          <h2 className="text-2xl font-serif font-bold text-stone-900 mb-6">{tr.home_top_conditions_title}</h2>
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <div className="space-y-3">
              {stats.top_conditions.map((c) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-sm text-stone-700 w-44 shrink-0 truncate">
                    {lang === "ar" ? c.name_ar : c.name}
                  </span>
                  <div className="flex-1 bg-stone-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${(c.count / topConditionMax) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-stone-800 w-6 text-end tabular-nums">
                    {formatStat(c.count, lang)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Data Table */}
      <section id="database" className="scroll-mt-24">
        <div className="mb-6">
          <h2 className="text-3xl font-serif font-bold text-stone-900">{tr.table_title}</h2>
          <p className="text-stone-500 mt-1 max-w-2xl">{tr.table_subtitle}</p>
        </div>
        <DataTable />
      </section>
    </main>
  );
}
