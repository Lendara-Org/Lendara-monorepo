import { useSyncExternalStore } from "react";

// The dashboard keeps the project's API key in this browser only, so the
// developer doesn't paste it on every visit. It is a sandbox key.
const STORAGE_KEY = "lendara:api-key";
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveApiKey(key: string | null) {
  try {
    if (key) window.localStorage.setItem(STORAGE_KEY, key);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: the key lives until the page reloads.
  }
  memory = key;
  listeners.forEach((l) => l());
}

let memory: string | null | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The saved API key; undefined while rendering on the server. */
export function useApiKey(): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (memory === undefined ? (memory = read()) : memory),
    () => undefined,
  );
}
