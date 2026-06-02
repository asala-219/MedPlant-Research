import React, { createContext, useContext, useState } from "react";
import type { Lang } from "./translations";

interface LangCtx {
  lang: Lang;
  toggle: () => void;
}

const Ctx = createContext<LangCtx>({ lang: "en", toggle: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  return (
    <Ctx.Provider value={{ lang, toggle: () => setLang((l) => (l === "en" ? "ar" : "en")) }}>
      <div dir={lang === "ar" ? "rtl" : "ltr"}>{children}</div>
    </Ctx.Provider>
  );
}

export const useLang = () => useContext(Ctx);
