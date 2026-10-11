import { useSyncExternalStore } from "react";
import type { Lang } from "./i18n";

// The viewer's language: their saved choice, else the browser's.
const STORAGE_KEY = "demo:lang";
const listeners = new Set<() => void>();
let current: Lang | undefined;

function initial(): Lang {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "es" || saved === "en") return saved;
  } catch {
    // Storage blocked: fall back to the browser language.
  }
  return navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
}

export function setLang(lang: Lang) {
  current = lang;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Not saved; the choice lasts until reload.
  }
  listeners.forEach((l) => l());
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (current ??= initial()),
    () => "es",
  );
}
