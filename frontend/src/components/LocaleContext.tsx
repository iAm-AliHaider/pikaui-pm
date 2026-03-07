"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Locale, t as translate } from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem("pikaui-locale") as Locale | null;
    if (stored === "en" || stored === "de") setLocaleState(stored);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("pikaui-locale", l);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => translate(locale, key, fallback),
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

// ── Language Toggle Button ─────────────────────────────
export function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
      <button
        onClick={() => setLocale("en")}
        className="px-2.5 py-1 text-xs font-semibold rounded-md transition-all"
        style={
          locale === "en"
            ? { background: "white", color: "#6c5ce7", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
            : { color: "#6b7280" }
        }
      >
        EN
      </button>
      <button
        onClick={() => setLocale("de")}
        className="px-2.5 py-1 text-xs font-semibold rounded-md transition-all"
        style={
          locale === "de"
            ? { background: "white", color: "#6c5ce7", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
            : { color: "#6b7280" }
        }
      >
        DE
      </button>
    </div>
  );
}
