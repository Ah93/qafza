"use client";

import { useEffect } from "react";
import { applyCalm } from "@/lib/sound";

/** registers the small service worker that makes the app installable and shows a friendly page offline */
export function RegisterSW() {
  useEffect(() => {
    applyCalm();
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
