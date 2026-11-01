"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { PAYWALL_EVENT, postJson } from "@/lib/client-api";
import { usePlan } from "../usePlan";
import { TeacherHeader } from "../TeacherHeader";
import { LessonPicker, ReportGate, useReport, type LessonReport } from "../report";
import { useToast } from "../Toast";

const goalColor = (p: number) => (p < 60 ? "#f59e0b" : p >= 75 ? "#10b981" : "#7b26cc");
const COLORS = ["#f59e0b", "#ec4899", "#8b5cf6", "#10b981", "#0ea5e9", "#f97316", "#14b8a6"];
const colorOf = (name: string) => COLORS[[...name].reduce((t, c) => t + c.charCodeAt(0), 0) % COLORS.length];

function Ring({ pct }: { pct: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 76 76" className="size-[76px] shrink-0 -rotate-90" role="img" aria-label={`${pct}%`}>
      <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="7" />
      <circle cx="38" cy="38" r={r} fill="none" stroke="#e0ab2d" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} />
    </svg>
  );
}

function Pill({ children, onClick, strong }: { children: React.ReactNode; onClick: () => void; strong?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs font-bold transition ${strong ? "border-violet/10 bg-violet/10 text-violet hover:bg-violet/15" : "border-violet/10 bg-white text-violet hover:border-violet/30"}`}
    >
      {children}
    </button>
  );
}

function Modal({ onClose, labelledBy, children }: { onClose: () => void; labelledBy: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-indigo-deep/40 p-5 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy} className="w-full max-w-[460px] animate-[pop_.3s_ease-out] rounded-[28px] bg-white p-7 shadow-2xl shadow-indigo-deep/30">
        {children}
      </div>
    </div>
  );
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

function download(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function ResultsView() {
  const { state, choose } = useReport();
  const toast = useToast();
  const [how, setHow] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [className, setClassName] = useState("");
  const [busy, setBusy] = useState(false);
  const { plan } = usePlan();
  const finished = state.phase === "ready" ? (state.report?.counts.done ?? 0) : 0;
  const lessonId = state.phase === "ready" ? state.id : "";

  // the free lesson has been played: say so once per lesson and visit (the design's "your free lesson is complete" moment)
  useEffect(() => {
    if (!plan || plan.entitled || plan.canCreate || !finished || !lessonId) return;
    try {
      if (sessionStorage.getItem(`qafza:paywall:${lessonId}`)) return;
      sessionStorage.setItem(`qafza:paywall:${lessonId}`, "1");
    } catch {}
    window.dispatchEvent(new Event(PAYWALL_EVENT));
  }, [plan, finished, lessonId]);

  if (state.phase !== "ready" || !state.report) {
    return (
      <>
        <TeacherHeader />
        <ReportGate phase={state.phase === "ready" ? "loading" : state.phase} error={state.phase === "error" ? state.error : undefined} />
      </>
    );
  }
  const r: LessonReport = state.report;
  const finishedNames = r.students.filter((s) => s.status !== "none").map((s) => s.name);

  function exportCsv() {
    const rows = [["الطالب", "الحالة", "الإتقان %", "آخر نتيجة", "ملاحظة"], ...r.students.map((s) => [s.name, s.status === "done" ? "أنهى" : s.status === "going" ? "جارٍ" : "لم يبدأ", s.mastery === null ? "" : String(s.mastery), s.lastScore, s.tip])];
    download(`qafza-${r.lesson.code}.csv`, rows.map((row) => row.map(csvCell).join(",")).join("\n"));
    toast.show("صُدّرت النتائج كملف CSV");
  }

  async function saveClass() {
    const name = className.trim();
    if (!name) return;
    setBusy(true);
    const res = await postJson("/api/classes", { name, kind: "school", students: finishedNames });
    setBusy(false);
    if (!res.ok) return void toast.show(res.error);
    setSaving(false);
    setClassName("");
    toast.show(`حُفظ الحاضرون كصف جديد: ${name}`);
  }

  return (
    <>
      <TeacherHeader />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-indigo-deep/55">
              {r.lesson.how === "self" ? "تعلّم ذاتي" : "حصة مباشرة"} · {r.lesson.className ?? "بلا صف"} · {r.counts.total} طالبًا
            </p>
            <h1 className="mt-1 text-[34px] font-bold leading-tight text-indigo-deep">نتائج: {r.lesson.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LessonPicker lessons={state.lessons} value={state.id} onChange={choose} />
            {!r.lesson.classId && finishedNames.length > 0 && <Pill onClick={() => setSaving(true)}>احفظ الحاضرين صفًّا</Pill>}
            <Pill strong onClick={() => setHow(true)}>
              كيف نحسب؟
            </Pill>
            <Pill onClick={exportCsv}>صدّر</Pill>
          </div>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[300px_1fr]">
          <section className="dots relative flex items-center justify-between gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-deep to-[#4a1d96] p-6 text-white shadow-xl shadow-indigo-deep/25">
            <div className="relative">
              <h2 className="text-xl font-bold">مستوى الإتقان</h2>
              <p className="mt-1.5 text-[11px] font-medium leading-5 text-white/70">
                {r.counts.done} من {r.counts.total} أكملوا{r.minutes ? ` · ${r.minutes} دقيقة` : ""}
              </p>
            </div>
            <div className="relative grid place-items-center">
              <Ring pct={r.mastery ?? 0} />
              <span className="absolute rotate-0 text-lg font-bold text-sun">{r.mastery === null ? "—" : `${r.mastery}%`}</span>
            </div>
          </section>

          <section className="rounded-3xl border border-pink-card/15 bg-gradient-to-l from-pink-card/[0.08] to-amber-50 p-6">
            {r.weakest ? (
              <>
                <p className="text-[11px] font-bold text-[#a3124a]">افعل الآن · فجوة فهم</p>
                <h2 className="mt-2 text-2xl font-bold leading-snug text-[#a3124a]">
                  {100 - r.weakest.pct}% من الطلاب أخطأوا في التحدي {r.weakest.index + 1} من المحاولة الأولى
                </h2>
                <p className="mt-2 text-xs font-semibold leading-6 text-[#a3124a]/80">«{r.weakest.question}»</p>
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <Link href={`/live/${r.lesson.code}`} className="rounded-full bg-[#a3124a] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-[#a3124a]/25 transition hover:brightness-110">
                    أعدها في حصة مباشرة
                  </Link>
                  <span className="text-[11px] font-semibold text-[#a3124a]/75">والأسئلة التي يخطئ فيها الطلاب المسجّلون تعود إليهم تلقائيًا في «تثبيت اليوم».</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-[11px] font-bold text-emerald-700">{r.counts.done ? "لا فجوة واضحة" : "بانتظار الطلاب"}</p>
                <h2 className="mt-2 text-2xl font-bold leading-snug text-indigo-deep">
                  {r.counts.done ? "لم يتعثّر الصف في تحدٍّ بعينه. أحسنت." : "لم يُنهِ أحد الدرس بعد، فلا فجوات لنعرضها."}
                </h2>
                <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/65">حين يلعب طلابك، تظهر هنا التحديات التي أخطأ فيها أكثرهم من المحاولة الأولى.</p>
              </>
            )}
          </section>
        </div>

        <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          <section className="min-w-0 rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-indigo-deep">الإتقان لكل محطة</h2>
            <ul className="mt-4 space-y-4">
              {r.challenges.map((g) => (
                <li key={g.label}>
                  <div className="flex items-center justify-between gap-2 text-xs font-bold text-indigo-deep">
                    <span className="truncate">{g.label}</span>
                    <span style={{ color: g.pct === null ? "#94a3b8" : goalColor(g.pct) }}>{g.pct === null ? "—" : `${g.pct}%`}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${g.pct ?? 0}%`, background: goalColor(g.pct ?? 0) }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="min-w-0 rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-indigo-deep">أصعب تحدٍّ على الصف</h2>
            {r.weakest ? (
              <>
                <p className="mt-2 text-xs font-semibold leading-6 text-indigo-deep/70">{r.weakest.question}</p>
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-[#c0174f]">{r.weakest.pct}%</span>
                  <span className="text-[11px] font-semibold text-indigo-deep/55">أصابوا من المحاولة الأولى · {r.weakest.hint}</span>
                </p>
                <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-[11px] font-semibold leading-6 text-rose-800">
                  هذه فجوة فهم في المحطة {r.weakest.index + 1} «{r.stationTitles[r.weakest.index]}». أعد شرحها في الحصة القادمة.
                </p>
              </>
            ) : (
              <p className="mt-3 rounded-2xl bg-violet/[0.05] px-4 py-5 text-xs font-bold leading-6 text-indigo-deep/60">لا تحدٍّ واحد تعثّر فيه الصف حتى الآن.</p>
            )}
          </section>

          <section className="min-w-0 rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-bold text-indigo-deep">الطلاب</h2>
              <span className="text-[10px] font-medium text-indigo-deep/50">اضغط طالبًا</span>
            </div>
            {r.students.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-violet/[0.05] px-4 py-5 text-center text-xs font-bold text-indigo-deep/60">لا طلاب بعد.</p>
            ) : (
              <ul className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
                {r.students.map((s) => {
                  const on = picked === s.name;
                  return (
                    <li key={s.name}>
                      <button
                        aria-expanded={on}
                        onClick={() => setPicked(on ? null : s.name)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-start transition ${on ? "bg-violet/[0.07]" : "hover:bg-violet/[0.04]"}`}
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: colorOf(s.name) }}>
                          {s.name[0]}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-bold text-indigo-deep">{s.name}</span>
                          <span className="block truncate text-[11px] font-medium text-indigo-deep/55">{s.status === "none" ? "لم يفتح الدرس" : s.status === "going" ? "لم يُنهِ الدرس" : `آخر نتيجة ${s.lastScore}`}</span>
                        </span>
                        <span className={`text-sm font-bold ${s.mastery === null ? "text-slate-400" : s.mastery < 60 ? "text-[#c0174f]" : "text-emerald-600"}`}>{s.mastery === null ? "—" : `${s.mastery}%`}</span>
                      </button>
                      {on && <p className="mx-2 mb-1 animate-[pop_.2s_ease-out] rounded-xl bg-violet/[0.06] px-3.5 py-2.5 text-[11px] font-semibold leading-6 text-indigo-deep/80">{s.tip}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>

      {saving && (
        <Modal onClose={() => setSaving(false)} labelledBy="save-class">
          <h2 id="save-class" className="text-2xl font-bold text-indigo-deep">احفظ الحاضرين صفًّا</h2>
          <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/70">يصير الـ{finishedNames.length} طالبًا صفًّا جديدًا في «صفوفي»، فتوزّعهم على مجموعات متكافئة وتتابع إتقانهم في دروسك القادمة.</p>
          <input
            data-autofocus
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            maxLength={60}
            placeholder="اسم الصف، مثل: ثاني متوسط (أ)"
            aria-label="اسم الصف"
            className="mt-4 w-full rounded-2xl border border-violet/15 px-4 py-3 text-sm outline-none focus:border-violet focus:ring-4 focus:ring-violet/10"
          />
          <div className="mt-4 flex gap-2.5">
            <button disabled={!className.trim() || busy} onClick={saveClass} className="flex-1 rounded-full bg-brand py-3 text-xs font-bold text-white shadow-lg shadow-violet/30 disabled:opacity-40">
              {busy ? "جارٍ الحفظ…" : "احفظ الصف"}
            </button>
            <button onClick={() => setSaving(false)} className="rounded-full border border-violet/15 px-6 py-3 text-xs font-bold text-violet">
              تراجع
            </button>
          </div>
        </Modal>
      )}

      {how && (
        <Modal onClose={() => setHow(false)} labelledBy="how-title">
          <div className="flex items-start justify-between gap-4">
            <h2 id="how-title" className="text-2xl font-bold text-indigo-deep">كيف نحسب الإتقان؟</h2>
            <button data-autofocus onClick={() => setHow(false)} aria-label="إغلاق" className="grid size-8 place-items-center rounded-full bg-violet/10 text-violet">
              <X className="size-4" />
            </button>
          </div>
          <ul className="mt-4 space-y-3 text-xs font-medium leading-6 text-indigo-deep/80">
            <li className="rounded-2xl bg-violet/[0.06] px-4 py-3">
              <b className="text-indigo-deep">من المحاولة الأولى.</b> نحسب كل طالب من إجابته الأولى في كل تحدٍّ، لأنها التي تقيس الفهم.
            </li>
            <li className="rounded-2xl bg-violet/[0.06] px-4 py-3">
              <b className="text-indigo-deep">متوسط الصف</b> هو متوسط إتقان طلابه، ومتوسط الطالب هو متوسط إتقانه في دروس الصف.
            </li>
            <li className="rounded-2xl bg-violet/[0.06] px-4 py-3">
              <b className="text-indigo-deep">النقاط خارج الحساب.</b> النقاط والشارات للتحفيز فقط، ولا تدخل في مستوى الإتقان ولا في هذا التقرير.
            </li>
            <li className="rounded-2xl bg-violet/[0.06] px-4 py-3">
              <b className="text-indigo-deep">الحصة على السبورة تقديرية.</b> يُحسب الإتقان من إجابات المجموعات. ولبيانات كل طالب، أرسل الدرس تعلّمًا ذاتيًا.
            </li>
          </ul>
        </Modal>
      )}

      {toast.node}
    </>
  );
}
