import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { errorMessage } from "../services/api";
import { cachedRead, fetchRead, markSavedView } from "../services/readCache";

export function useApi<T>(path: string) {
  const [state, setState] = useState<{ path: string; data: T | null; error: string; loading: boolean; savedAt: number | null }>(() => {
    const cached = cachedRead<T>(path);
    return { path, data: cached?.data ?? null, error: "", loading: !cached, savedAt: cached?.savedAt ?? null };
  });
  const [version, setVersion] = useState(0);
  const retry = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cached = cachedRead<T>(path);
    setState({ path, data: cached?.data ?? null, error: "", loading: !cached, savedAt: cached?.savedAt ?? null });
    markSavedView(path, cached?.savedAt ?? null);
    const refresh = async (attempt = 0) => {
      try {
        const data = await fetchRead<T>(path);
        if (active) {
          markSavedView(path, null);
          setState({ path, data, error: "", loading: false, savedAt: null });
        }
      } catch (error) {
        if (!active) return;
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        const transient = status == null || [408, 429, 502, 503, 504].includes(status);
        const retrying = transient && attempt < 2;
        setState(old => ({ ...old, loading: false, error: old.data ? "" : errorMessage(error) + (retrying ? " Reconnecting automatically…" : "") }));
        if (retrying) timer = setTimeout(() => { void refresh(attempt + 1); }, (attempt + 1) * 5000);
      }
    };
    void refresh();
    return () => { active = false; clearTimeout(timer); markSavedView(path, null); };
  }, [path, version]);
  // Do not display a previous path's data during navigation.
  return { ...(state.path === path ? state : { data: null, error: "", loading: true, savedAt: null }), retry };
}
