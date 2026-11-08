"use client";

import * as plural from "@/lib/plural";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import type { Lesson, ShareConfig } from "@/lib/lesson";
import type { LessonReport } from "@/lib/server/results";
import { TeacherHeader } from "../TeacherHeader";
import { useFlow } from "../FlowProvider";
import { CodeCard } from "../share/CodeCard";

type Loaded = { lesson: Lesson; code: string; status: "draft" | "published"; share: ShareConfig };

/** one lesson: its code, link and QR, how it went, and the ways to run it or change it */
export function LessonPage() {
  const id = String(useParams<{ id: string }>().id ?? "");
  const router = useRouter();
  const { openSaved } = useFlow();
  const [data, setData] = useState<Loaded | null>(null);
  const [report, setReport] = useState<LessonReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const [a, b] = await Promise.all([api<Loaded>(`/api/lessons/${id}`), api<{ report: LessonReport }>(`/api/lessons/${id}/report`)]);
      if (!live) return;
      if (!a.ok) return setError(a.error);
      setData(a.data);
      if (b.ok) setReport(b.data.report);
    })();
    return () => {
      live = false;
    };
  }, [id]);

  /** the editing screens work on the lesson held in memory: load this one into it, then go */
  async function edit(to: string) {
    setBusy(true);
    const ok = await openSaved(id);
    setBusy(false);
    if (ok) router.push(to);
    else setError("تعذّر فتح الدرس. حاول مجددًا.");
  }

  if (error || !data) {
    return (
      <>
        <TeacherHeader />
        <main className="grid flex-1 place-items-center px-5 py-16 text-center">
          {error ? (
            <div role="alert" className="max-w-sm">
              <p className="text-sm font-bold text-[#c0174f]">{error}</p>
              <Link href="/lessons" className="mt-4 inline-block rounded-full bg-brand px-8 py-3 text-sm font-bold text-white">
                إلى دروسي
              </Link>
            </div>
          ) : (
            <p role="status" className="text-sm font-bold text-indigo-deep/60">جارٍ تحميل الدرس…</p>
          )}
        </main>
      </>
    );
  }

  const published = data.status === "published";
  const live = data.share.how === "live";
  const btn = "rounded-full border border-violet/15 bg-white px-6 py-3 text-xs font-bold text-violet shadow-sm transition hover:border-violet/40 disabled:opacity-60";

  return (
    <>
      <TeacherHeader />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 py-7">
        <Link href="/lessons" className="text-[11px] font-bold text-violet underline underline-offset-4">
          ← دروسي
        </Link>
        <div className="mt-3 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_300px]">
          <section className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-bold text-violet">
              <span className={`size-2 rounded-full ${published ? "bg-mint" : "bg-slate-400"}`} />
              {published ? (live ? "منشور · حصة مباشرة" : "منشور · تعلّم ذاتي") : "مسودة"}
            </p>
            <h1 className="mt-1 text-[34px] font-bold leading-tight text-indigo-deep">{data.lesson.title}</h1>
            <p className="mt-1 text-xs font-semibold text-indigo-deep/55">
              {plural.stations(data.lesson.stations.length)} وتحدّي الزعيم{report?.lesson.className ? ` · ${report.lesson.className}` : ""}
            </p>

            {published && report && (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { n: report.counts.done, l: "أنهوا الدرس", c: "text-emerald-600" },
                  { n: report.counts.going, l: "بدأوا ولم ينهوا", c: "text-amber-600" },
                  { n: report.mastery === null ? "—" : `${report.mastery}%`, l: "متوسط الإتقان", c: "text-violet" },
                ].map((s) => (
                  <div key={s.l} className="rounded-3xl border border-violet/10 bg-white px-5 py-4 shadow-sm">
                    <p className={`text-[28px] font-bold leading-tight ${s.c}`}>{s.n}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-indigo-deep/60">{s.l}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2.5">
              {published && live && (
                <Link href={`/live/${data.code}`} className="rounded-full bg-brand px-8 py-3 text-xs font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110">
                  ابدأ حصة مباشرة
                </Link>
              )}
              {published && (
                <>
                  <Link href={`/results?code=${data.code}`} className={btn}>
                    النتائج
                  </Link>
                  {!live && (
                    <Link href={`/lessons/tracking?code=${data.code}`} className={btn}>
                      متابعة الطلاب
                    </Link>
                  )}
                  <button disabled={busy} onClick={() => edit("/create/share")} className={btn}>
                    إعدادات المشاركة
                  </button>
                </>
              )}
              <button disabled={busy} onClick={() => edit("/play/preview")} className={btn}>
                جرّبه كطالب
              </button>
              <button disabled={busy} onClick={() => edit("/create/review")} className={`${btn} border-indigo-deep/20 text-indigo-deep`}>
                عدّل
              </button>
            </div>

            <h2 className="mb-2 mt-7 text-lg font-bold text-indigo-deep">محطات الدرس</h2>
            <ol className="space-y-2">
              {data.lesson.stations.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-violet/10 bg-white px-4 py-3 shadow-sm">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-violet/10 text-xs font-bold text-violet">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-indigo-deep">{s.title}</span>
                  {report?.challenges[i]?.pct != null && <span className="text-[11px] font-bold text-indigo-deep/55">{report.challenges[i].pct}%</span>}
                </li>
              ))}
            </ol>
          </section>

          <CodeCard code={data.code} preview={false} />
        </div>
      </main>
    </>
  );
}
