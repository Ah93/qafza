"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import type { PlanStatus } from "@/lib/pricing";

/** the signed-in teacher's plan (null while loading) */
export function usePlan() {
  const [plan, setPlan] = useState<PlanStatus | null>(null);
  const reload = useCallback(async () => {
    const r = await api<{ status: PlanStatus }>("/api/billing/status");
    if (r.ok) setPlan(r.data.status);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => void reload(), 0);
    return () => clearTimeout(t);
  }, [reload]);
  return { plan, reload };
}

export const dateAr = (ms: number) => new Date(ms).toLocaleDateString("ar", { day: "numeric", month: "long", year: "numeric" });
