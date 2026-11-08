"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import type { FunnelStep } from "@/lib/server/events";
import { TeacherHeader } from "../teacher/TeacherHeader";
import { ReportsList } from "../ReportsList";

type Data = { steps: FunnelStep[]; extra: FunnelStep[]; since: number };

/** where teachers drop off, step by step: one bar per step, and each step as a share of the one before it and of sign-ups */
export function FunnelView() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api<Data>(`/api/admin/funnel?days=${days}`).then((r) => {
      if (!live) return;
      if (r.ok) {
        setData(r.data);
        setError(null);
      } else setError(r.status === 404 ? "هذه الصفحة غير متاحة لحسابك." : r.error);
    });
    return () => {
      live = false;
    };
  }, [days]);

  const top = Math.max(1, data?.steps[0]?.users ?? 1);
  return (
    <>
      <TeacherHeader />
      <main className="mx-auto w-full max-w-[860px] flex-1 px-5 py-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-violet">لوحة الفريق</p>
            <h1 className="mt-1 text-[32px] font-bold leading-tight text-indigo-deep">مسار المعلّمين</h1>
            <p className="mt-1 text-xs font-medium text-indigo-deep/70">كل رقم هو عدد المعلّمين المختلفين الذين بلغوا الخطوة. لا يُحفظ شيء عن الطلاب.</p>
          </div>
          <div role="radiogroup" aria-label="المدة" className="flex rounded-full bg-violet/10 p-1">
            {[7, 30, 90].map((d) => (
              <button key={d} role="radio" aria-checked={days === d} onClick={() => setDays(d)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${days === d ? "bg-white text-indigo-deep shadow-sm" : "text-indigo-deep/70"}`}>
                {d} يومًا
              </button>
            ))}
          </div>
        </div>

        {error && <p role="alert" className="rounded-2xl bg-rose-50 px-5 py-4 text-sm font-bold text-rose-800">{error}</p>}
        {!data && !error && <p role="status" className="text-sm font-bold text-indigo-deep/70">جارٍ التحميل…</p>}

        {data && (
          <>
            <ol className="space-y-3">
              {data.steps.map((s, i) => {
                const prev = i === 0 ? null : data.steps[i - 1].users;
                const ofPrev = prev ? Math.round((s.users / prev) * 100) : null;
                const ofTop = Math.round((s.users / top) * 100);
                return (
                  <li key={s.name} className="rounded-3xl border border-violet/10 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3 text-sm font-bold text-indigo-deep">
                      <span>
                        {i + 1}. {s.label}
                      </span>
                      <span className="text-violet">{s.users}</span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={ofTop} aria-valuemin={0} aria-valuemax={100} aria-label={s.label}>
                      <div className="h-full rounded-full bg-brand" style={{ width: `${ofTop}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-indigo-deep/70">
                      {ofPrev !== null ? `${ofPrev}% ممّن سبقوهم · ` : ""}
                      {ofTop}% من المسجّلين
                    </p>
                  </li>
                );
              })}
            </ol>
            <h2 className="mb-2 mt-7 text-lg font-bold text-indigo-deep">أحداث أخرى</h2>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {data.extra.map((s) => (
                <li key={s.name} className="flex items-center justify-between rounded-2xl border border-violet/10 bg-white px-4 py-3 text-xs font-bold text-indigo-deep shadow-sm">
                  <span>{s.label}</span>
                  <span className="text-violet">{s.events}</span>
                </li>
              ))}
            </ul>
            <ReportsList endpoint="/api/admin/reports" canResolve={false} />
          </>
        )}
      </main>
    </>
  );
}
