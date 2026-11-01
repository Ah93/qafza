"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client-api";
import type { LessonSummary } from "@/lib/lesson";
import type { LessonReport } from "@/lib/server/results";

export type { LessonReport };

type State =
  | { phase: "loading" }
  | { phase: "error"; error: string }
  | { phase: "empty" }
  | { phase: "ready"; lessons: LessonSummary[]; id: string; report: LessonReport | null };

/**
 * The lesson a results screen is about: the one named in ?code=, else the teacher's latest published lesson.
 * `choose` switches lesson; `reload` fetches the report again (after a change).
 */
export function useReport() {
  const wanted = (useSearchParams().get("code") ?? "").toUpperCase();
  const [state, setState] = useState<State>({ phase: "loading" });
  const [chosen, setChosen] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      const list = await api<{ lessons: LessonSummary[] }>("/api/lessons");
      if (!live) return;
      if (!list.ok) return setState({ phase: "error", error: list.error });
      const usable = list.data.lessons.filter((l) => l.status === "published" && !l.archived);
      if (!usable.length) return setState({ phase: "empty" });
      const id = chosen ?? usable.find((l) => l.code === wanted)?.id ?? usable[0].id;
      const r = await api<{ report: LessonReport }>(`/api/lessons/${id}/report`);
      if (!live) return;
      if (!r.ok) return setState({ phase: "error", error: r.error });
      setState({ phase: "ready", lessons: usable, id, report: r.data.report });
    })();
    return () => {
      live = false;
    };
  }, [wanted, chosen, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { state, choose: setChosen, reload };
}

export function LessonPicker({ lessons, value, onChange }: { lessons: LessonSummary[]; value: string; onChange: (id: string) => void }) {
  if (lessons.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-[11px] font-bold text-indigo-deep/60">
      الدرس
      <select value={value} onChange={(e) => onChange(e.target.value)} className="max-w-[220px] rounded-full border border-violet/15 bg-white px-3.5 py-2 text-xs font-bold text-indigo-deep outline-none focus:border-violet">
        {lessons.map((l) => (
          <option key={l.id} value={l.id}>
            {l.title}
          </option>
        ))}
      </select>
    </label>
  );
}

/** what a results screen shows while loading, on a failure, or before the teacher has published anything */
export function ReportGate({ phase, error }: { phase: "loading" | "error" | "empty"; error?: string }) {
  return (
    <main className="grid flex-1 place-items-center px-5 py-16 text-center">
      {phase === "loading" ? (
        <p role="status" className="text-sm font-bold text-indigo-deep/60">جارٍ تحميل النتائج…</p>
      ) : phase === "error" ? (
        <p role="alert" className="max-w-sm text-sm font-bold text-[#c0174f]">{error}</p>
      ) : (
        <div className="max-w-sm">
          <h1 className="text-2xl font-bold text-indigo-deep">لا دروس منشورة بعد</h1>
          <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/65">حين تنشر درسًا وتلعبه مع طلابك، تظهر هنا نتائجه: من أتقن ومن تعثّر وأين.</p>
          <Link href="/create" className="mt-5 inline-block rounded-full bg-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30">
            أنشئ درسًا
          </Link>
        </div>
      )}
    </main>
  );
}
