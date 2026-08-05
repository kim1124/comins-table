import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import type { LocalizedText, PlaygroundLocale } from "./types";

export const PLAYGROUND_LOCALE_STORAGE_KEY = "comins-table-playground-locale";

export function defineLocalizedText(ko: string, en: string): LocalizedText {
  if (!ko.trim() || !en.trim()) {
    throw new Error("playground-localization: incomplete localized text");
  }

  return Object.freeze({ en, ko });
}

export function resolveLocalizedText(value: LocalizedText, locale: PlaygroundLocale): string {
  if (!value.ko.trim() || !value.en.trim()) {
    throw new Error("playground-localization: incomplete localized text");
  }

  return value[locale];
}

function readStoredLocale(): PlaygroundLocale {
  try {
    const stored = window.localStorage.getItem(PLAYGROUND_LOCALE_STORAGE_KEY);
    return stored === "en" || stored === "ko" ? stored : "ko";
  } catch {
    return "ko";
  }
}

type PlaygroundLocaleContextValue = {
  locale: PlaygroundLocale;
  setLocale: (locale: PlaygroundLocale) => void;
  text: (value: LocalizedText) => string;
};

const PlaygroundLocaleContext = createContext<PlaygroundLocaleContextValue | null>(null);

export function PlaygroundLocaleProvider({ children }: PropsWithChildren) {
  const [locale, setLocale] = useState<PlaygroundLocale>(readStoredLocale);
  const value = useMemo<PlaygroundLocaleContextValue>(
    () => ({ locale, setLocale, text: (localized) => resolveLocalizedText(localized, locale) }),
    [locale],
  );

  useEffect(() => {
    document.documentElement.lang = locale;

    try {
      window.localStorage.setItem(PLAYGROUND_LOCALE_STORAGE_KEY, locale);
    } catch {
      // The in-memory locale remains usable when storage is unavailable.
    }
  }, [locale]);

  return (
    <PlaygroundLocaleContext.Provider value={value}>{children}</PlaygroundLocaleContext.Provider>
  );
}

export function usePlaygroundLocale(): PlaygroundLocaleContextValue {
  const value = useContext(PlaygroundLocaleContext);

  if (!value) {
    throw new Error("usePlaygroundLocale must be used within PlaygroundLocaleProvider");
  }

  return value;
}
