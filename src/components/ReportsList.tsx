"use client";

import { useEffect, useState } from "react";
import { api, postJson } from "@/lib/client-api";
import { ago } from "@/lib/ago";
import type { Report } from "@/lib/server/reports";

/** reports of mistakes in lessons: a teacher sees and clears those of one lesson; the team sees all of them */
export function ReportsList({ lessonId, endpoint, canResolve }: { lessonId?: string; endpoint: string; canResolve: boolean }) {
  const [rows, setRows] = useState<Report[] | null>(null);

  useEffect(() => {
    let live = true;
    api<{ reports: Report[] }>(endpoint).then((r) => live && setRows(r.ok ? r.data.reports : []));
    return () => {
      live = false;
    };
  }, [endpoint]);

  const shown = (rows ?? []).filter((r) => (!lessonId || r.lessonId === lessonId) && r.status === "open");
  async function resolve(id: string) {
    const r = await postJson("/api/reports", { id }, "PATCH");
    if (r.ok) setRows((all) => (all ?? []).map((x) => (x.id === id ? { ...x, status: "resolved" } : x)));
  }
  if (!rows || shown.length === 0) return null;
  return (
    <section className="mt-7" aria-label="بلاغات الأخطاء">
      <h2 className="mb-2 text-lg font-bold text-indigo-deep">بلاغات عن أخطاء ({shown.length})</h2>
      <ul className="space-y-2">
        {shown.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-950">
            <span className="min-w-0 flex-1 leading-6">
              {!lessonId && <b>{r.lessonTitle} · </b>}
              <b>{r.part === "challenge" ? "تحدي" : "محطة"} «{r.stationTitle}»</b>
              {r.note ? `: ${r.note}` : ""} <span className="text-amber-900/70">· {ago(r.createdAt)}</span>
            </span>
            {canResolve && (
              <button onClick={() => resolve(r.id)} className="min-h-9 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold text-white">
                تمّ التصحيح
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
