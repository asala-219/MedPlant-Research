import React from "react";
import { ChatPanel } from "../components/ChatPanel";
import { useLang } from "../../i18n/LangContext";
import { t } from "../../i18n/translations";

export function Chat() {
  const { lang } = useLang();
  const tr = t[lang];

  return (
    <main className="max-w-3xl mx-auto px-6 pt-10 pb-6 flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      {/* Header */}
      <div className="mb-4 shrink-0">
        <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-emerald-600 mb-1">
          {tr.chat_badge}
        </h2>
        <h1 className="text-3xl font-serif font-bold text-stone-900">{tr.chat_title}</h1>
        <p className="text-stone-500 mt-1">{tr.chat_subtitle}</p>
      </div>

      {/* Reusable chat surface */}
      <div className="flex-1 min-h-0">
        <ChatPanel variant="page" />
      </div>
    </main>
  );
}
