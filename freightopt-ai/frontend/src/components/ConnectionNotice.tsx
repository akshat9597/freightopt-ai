import { useEffect, useState } from "react";
import { connectionDegraded, savedViewTime } from "../services/readCache";
import { Notice } from "./UI";

export function ConnectionNotice() {
  const [degraded, setDegraded] = useState(connectionDegraded);
  const [savedAt, setSavedAt] = useState(savedViewTime);
  useEffect(() => {
    const update = () => { setDegraded(connectionDegraded()); setSavedAt(savedViewTime()); };
    update();
    window.addEventListener("freightopt-connection", update);
    return () => window.removeEventListener("freightopt-connection", update);
  }, []);
  if (!degraded) return savedAt ? <Notice>Showing saved data from {new Date(savedAt).toLocaleString()} while checking for an update.</Notice> : null;
  return <Notice>The forecasting server is temporarily unavailable. Saved results may be shown from your last successful visit (up to 24 hours old). New voyage calculations require a server connection.</Notice>;
}
