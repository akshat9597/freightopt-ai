import { api } from "./api";

type Entry = { savedAt: number; data: unknown };
const memory = new Map<string, Entry>();
const pending = new Map<string, Promise<unknown>>();
const failures = new Set<string>();
const savedViews = new Map<string, number>();
const maxAge = 24 * 60 * 60 * 1000;
const prefix = `freightopt-read-v1:${api.defaults.baseURL}:`;

export function savedViewTime() { return savedViews.size ? Math.min(...savedViews.values()) : null; }
export function markSavedView(path: string, savedAt: number | null) {
  if (savedAt) savedViews.set(path, savedAt); else savedViews.delete(path);
  window.dispatchEvent(new Event("freightopt-connection"));
}
export function connectionDegraded() { return failures.size > 0; }
export function readStatus(path: string, failed: boolean) {
  if (failed) failures.add(path); else failures.delete(path);
  window.dispatchEvent(new Event("freightopt-connection"));
}

export function cachedRead<T>(path: string): Entry & { data: T } | null {
  let entry = memory.get(path);
  if (!entry) {
    try { entry = JSON.parse(localStorage.getItem(prefix + path) || "null") || undefined; }
    catch { /* Storage can be unavailable in private browsing. */ }
  }
  if (!entry || !Number.isFinite(entry.savedAt) || Date.now() - entry.savedAt > maxAge || entry.data == null) return null;
  return entry as Entry & { data: T };
}

// Share in-flight reads, including StrictMode remounts. Never retry POST mutations.
export async function fetchRead<T>(path: string): Promise<T> {
  let request = pending.get(path);
  if (!request) {
    request = api.get(path).then(({ data, headers }) => {
      if (!String(headers["content-type"]).includes("application/json") || data == null || typeof data !== "object")
        throw new Error("The server returned an invalid response. Please retry shortly.");
      const entry = { savedAt: Date.now(), data };
      memory.set(path, entry);
      if (memory.size > 50) memory.delete(memory.keys().next().value!);
      try { localStorage.setItem(prefix + path, JSON.stringify(entry)); }
      catch { /* Memory cache still works when storage is full or disabled. */ }
      readStatus(path, false);
      return data;
    }).catch((error: unknown) => {
      readStatus(path, true);
      throw error;
    }).finally(() => pending.delete(path));
    pending.set(path, request);
  }
  return request as Promise<T>;
}
