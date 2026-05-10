import React from "react";
import { Outlet, Link, useLocation } from "react-router";
import { Leaf, Network, MessageSquare, Database, Languages } from "lucide-react";
import { API_BASE_URL } from "../../api/client";
import { LangProvider, useLang } from "../../i18n/LangContext";
import { t } from "../../i18n/translations";

function NavInner() {
  const location = useLocation();
  const { lang, toggle } = useLang();
  const tr = t[lang];

  const navLinks = [
    { to: "/", label: tr.nav_home, icon: <Leaf className="w-4 h-4" /> },
    { to: "/#database", label: tr.nav_database, icon: <Database className="w-4 h-4" /> },
    { to: "/graph", label: tr.nav_graph, icon: <Network className="w-4 h-4" /> },
    { to: "/chat", label: tr.nav_chat, icon: <MessageSquare className="w-4 h-4" /> },
  ];

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to.replace("/#", "/").replace("#database", ""));
  };

  return (
    <div className="min-h-screen bg-[#FBFBF9] font-sans text-stone-900 overflow-x-hidden selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <header className="w-full bg-white/95 backdrop-blur-sm border-b border-stone-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-inner shadow-emerald-700">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold font-serif text-stone-900 leading-none">OmaniEthnoDBKG</p>
              <p className="text-[10px] text-stone-400 font-medium leading-none mt-0.5">{tr.nav_subtitle}</p>
            </div>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(to)
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-stone-600 hover:text-emerald-700 hover:bg-stone-50"
                }`}
              >
                {icon}
                {label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={toggle}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 text-sm font-medium text-stone-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
              title="Toggle language / تغيير اللغة"
            >
              <Languages className="w-4 h-4" />
              {lang === "en" ? "عربي" : "EN"}
            </button>

            {/* API docs link */}
            <a
              href={`${API_BASE_URL}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-emerald-800 transition-colors"
            >
              API Docs
            </a>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex items-center gap-1 overflow-x-auto px-4 pb-2 pt-0">
          {navLinks.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isActive(to)
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-stone-600 hover:text-emerald-700"
              }`}
            >
              {icon}
              {label}
            </Link>
          ))}
        </div>
      </header>

      <Outlet />

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 py-12 border-t border-stone-800">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-stone-700 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-stone-300" />
            </div>
            <div>
              <p className="text-stone-300 font-bold font-serif text-sm">OmaniEthnoDBKG</p>
              <p className="text-xs text-stone-500">Oman's Ethnomedicinal Plant Knowledge Graph</p>
            </div>
          </div>
          <p className="text-xs text-center max-w-sm">
            Data for research and educational purposes only. Consult a medical professional before using any ethnomedicinal remedies.
          </p>
          <p className="text-xs opacity-50">© 2026 OmaniEthno Project</p>
        </div>
      </footer>
    </div>
  );
}

export function Root() {
  return (
    <LangProvider>
      <NavInner />
    </LangProvider>
  );
}
