"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus, X } from "lucide-react";
import { postJson } from "@/lib/client-api";
import { ago } from "@/lib/ago";
import { TeacherHeader } from "../TeacherHeader";
import { LessonPicker, ReportGate, useReport, type LessonReport } from "../report";
import { useToast } from "../Toast";

type Status = "done" | "going" | "none";

const STATUS_STYLE: Record<Status, { label: string; cls: string }> = {
  done: { label: "أنهى", cls: "bg-mint/15 text-emerald-700" },
  going: { label: "جارٍ", cls: "bg-amber-100 text-amber-700" },
  none: { label: "لم يبدأ", cls: "bg-slate-100 text-slate-500" },
};

const COLORS = ["#7c3aed", "#10b981", "#0ea5e9", "#ec4899", "#f97316", "#14b8a6", "#22c55e", "#f59e0b", "#64748b"];
const colorOf = (name: string) => COLORS[[...name].reduce((t, c) => t + c.charCodeAt(0), 0) % COLORS.length];
const COLS = "grid-cols-[1.35fr_.8fr_1.35fr_.75fr_.85fr_1.1fr]";
const SHOWN = 12;

function StatCard({ n, total, label, color, bar }: { n: number; total: number; label: string; color: string; bar: string }) {
  return (
    <div className="rounded-3xl border border-violet/10 bg-white px-5 py-4 shadow-sm">
      <p className="text-4xl font-bold" style={{ color }}>
        {n}
      </p>
      <p className="mt-0.5 text-xs font-bold text-indigo-deep">{label}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: `${bar}26` }}>
        <div className="h-full rounded-full" style={{ width: `${total ? (n / total) * 100 : 0}%`, background: bar }} />
      </div>
    </div>
  );
}

function Segments({ n, of, status }: { n: number; of: number; status: Status }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: of }, (_, i) => (
          <span key={i} className={`h-1.5 w-[18px] rounded-full ${i < n ? (status === "done" ? "bg-mint" : "bg-amber-500") : "bg-slate-200"}`} />
        ))}
      </span>
      <span className="text-[11px] font-semibold text-indigo-deep/55">
        {n}/{of}
      </span>
    </span>
  );
}

/** the new due date counts from now, or from the current due date when that is later */
const extendedDue = (dueAt: number | null, days: number) => Math.max(Date.now(), dueAt ?? 0) + days * 86_400_000;

function dueLabel(dueAt: number | null): { text: string; late: boolean } {
  if (!dueAt) return { text: "بلا موعد محدد", late: false };
  const day = new Date(dueAt).toLocaleDateString("ar", { weekday: "long" });
  const time = new Date(dueAt).toLocaleTimeString("ar", { hour: "numeric", minute: "2-digit" });
  const left = Math.ceil((dueAt - Date.now()) / 86_400_000);
  if (left < 0) return { text: `انتهى الموعد ${day}`, late: true };
  if (left === 0) return { text: `ينتهي اليوم ${time}`, late: false };
  return { text: `حتى ${day} ${time} · باقي ${left === 1 ? "يوم" : left === 2 ? "يومان" : `${left} أيام`}`, late: false };
}

export function TrackingView() {
  const { state, choose, reload } = useReport();
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const [all, setAll] = useState(false);

  if (state.phase !== "ready" || !state.report) {
    return (
      <>
        <TeacherHeader />
        <ReportGate phase={state.phase === "ready" ? "loading" : state.phase} error={state.phase === "error" ? state.error : undefined} />
      </>
    );
  }
  const r: LessonReport = state.report;
  const total = r.stationTitles.length;
  const due = dueLabel(r.lesson.dueAt);
  const rows = all ? r.students : r.students.slice(0, SHOWN);
  const joinUrl = () => `${window.location.origin}/join?code=${r.lesson.code}`;

  // where the students who have not finished are stuck
  const stuck = r.students.filter((s) => s.status === "going");
  const atStation = new Map<number, number>();
  stuck.forEach((s) => atStation.set(Math.min(total - 1, s.reached), (atStation.get(Math.min(total - 1, s.reached)) ?? 0) + 1));
  const [stuckAt, stuckN] = [...atStation.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];

  async function extend(days: number, label: string) {
    const res = await postJson(`/api/lessons/${r.lesson.id}`, { share: { ...r.share, dueAt: extendedDue(r.lesson.dueAt, days) } }, "PATCH");
    if (!res.ok) return void toast.show(res.error);
    toast.show(`مُدّد الموعد ${label}`);
    reload();
  }

  async function remind() {
    const text = `تذكير: درس «${r.lesson.title}» ${r.lesson.dueAt ? `ينتهي ${dueLabel(r.lesson.dueAt).text.replace(/^حتى /, "")}` : "بانتظارك"}.\nادخل بالرمز ${r.lesson.code} أو من الرابط: ${joinUrl()}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.show("نُسخت رسالة التذكير. ألصقها في مجموعة الصف.");
    } catch {
      toast.show(text);
    }
  }

  return (
    <>
      <TeacherHeader />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold text-violet">
              <span className="size-2 rounded-full bg-violet" />
              {r.lesson.how === "self" ? "تعلّم ذاتي" : "حصة مباشرة"} · {r.lesson.className ?? "بلا صف"} · الرمز <span dir="ltr">{r.lesson.code}</span>
            </p>
            <h1 className="mt-1 text-[34px] font-bold leading-tight text-indigo-deep">{r.lesson.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <LessonPicker lessons={state.lessons} value={state.id} onChange={choose} />
            <span className={`rounded-full px-4 py-2 text-[11px] font-bold ${due.late ? "bg-rose-100 text-[#c0174f]" : "bg-pink-card/10 text-[#c0174f]"}`}>{due.text}</span>
            <button onClick={reload} className="rounded-full border border-violet/10 bg-white px-4 py-2 text-xs font-bold text-violet shadow-sm transition hover:border-violet/30">
              حدّث
            </button>
            <Link href={`/results?code=${r.lesson.code}`} className="rounded-full border border-violet/10 bg-white px-5 py-2 text-xs font-bold text-violet shadow-sm transition hover:border-violet/30">
              النتائج حتى الآن
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard n={r.counts.done} total={r.counts.total} label="أنهوا الدرس" color="#059669" bar="#10b981" />
          <StatCard n={r.counts.going} total={r.counts.total} label="بدأوا ولم ينهوا" color="#f59e0b" bar="#f59e0b" />
          <StatCard n={r.counts.none} total={r.counts.total} label="لم يفتحوا الدرس" color="#64748b" bar="#64748b" />
        </div>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1fr_340px]">
          <section className="min-w-0 rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-indigo-deep">كل الطلاب</h2>

            {r.students.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-violet/[0.05] px-5 py-8 text-center text-xs font-bold leading-6 text-indigo-deep/65">
                لم يدخل أحد هذا الدرس بعد. أعطهم الرمز <span dir="ltr" className="font-bold text-violet">{r.lesson.code}</span> وسيظهرون هنا فور أن يبدأوا.
              </p>
            ) : (
              <div role="table" aria-label="كل الطلاب" className="mt-4 overflow-x-auto">
                <div className="min-w-[640px]">
                  <div role="row" className={`grid ${COLS} items-center gap-2 border-b border-violet/10 px-2 pb-3 text-[11px] font-semibold text-indigo-deep/50`}>
                    {["الطالب", "الحالة", "المحطات", "المحاولات", "آخر نتيجة", "آخر نشاط"].map((h) => (
                      <span key={h} role="columnheader">
                        {h}
                      </span>
                    ))}
                  </div>

                  {rows.map((s) => {
                    const isOpen = open === s.name;
                    const st = STATUS_STYLE[s.status];
                    return (
                      <div key={s.name} className="border-b border-violet/[0.07] last:border-0">
                        <button
                          role="row"
                          aria-expanded={isOpen}
                          onClick={() => setOpen(isOpen ? null : s.name)}
                          className={`grid w-full ${COLS} items-center gap-2 px-2 py-3 text-start transition hover:bg-violet/[0.03]`}
                        >
                          <span className="flex items-center gap-2.5 text-[13px] font-bold text-indigo-deep">
                            <span className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: colorOf(s.name) }}>
                              {s.name[0]}
                            </span>
                            <span className="truncate">{s.name}</span>
                          </span>
                          <span>
                            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                          </span>
                          <Segments n={s.reached} of={total} status={s.status} />
                          <span className="text-[11px] font-bold text-indigo-deep/60">
                            {s.attempts.length === 0 ? "—" : s.attempts.length > 1 ? <span className="grid size-6 place-items-center rounded-full bg-violet/10 text-violet">{s.attempts.length}</span> : s.attempts.length}
                          </span>
                          <span className="text-[13px] font-bold text-indigo-deep">{s.lastScore}</span>
                          <span className="text-[11px] font-medium text-indigo-deep/50">{s.lastAt ? ago(s.lastAt) : "لم يفتح الدرس"}</span>
                        </button>

                        {isOpen && (
                          <div className="mx-1 mb-3 animate-[pop_.25s_ease-out] rounded-2xl bg-violet/[0.06] p-4">
                            {s.attempts.length === 0 ? (
                              <p className="text-xs font-medium text-indigo-deep/60">لم يفتح {s.name} الدرس بعد، فلا محاولات لعرضها.</p>
                            ) : (
                              <>
                                <h3 className="text-xs font-bold text-violet">المحاولات ونتيجة كل تحدٍّ</h3>
                                <ul className="mt-2.5 space-y-2">
                                  {s.attempts.map((a, i) => (
                                    <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-2.5">
                                      <span className="text-xs font-bold text-indigo-deep">
                                        المحاولة {i + 1} · {ago(a.at)}
                                        {!a.finished && <span className="ms-1.5 text-[10px] font-semibold text-amber-600">(لم تنتهِ)</span>}
                                      </span>
                                      <span className="flex items-center gap-1.5">
                                        {a.answers.map((ok, j) => (
                                          <span
                                            key={j}
                                            title={`التحدي ${j + 1}: ${ok === null ? "لم يصل إليه" : ok ? "صحيح" : "خاطئ"}`}
                                            className={`grid size-6 place-items-center rounded-md ${ok === null ? "bg-slate-100 text-slate-400" : ok ? "bg-mint/15 text-emerald-600" : "bg-rose-100 text-rose-600"}`}
                                          >
                                            {ok === null ? <Minus className="size-3.5" strokeWidth={3} /> : ok ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}
                                          </span>
                                        ))}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                                <p className="mt-3 text-[11px] font-medium text-indigo-deep/70">{s.tip}</p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {r.students.length > SHOWN && (
              <button onClick={() => setAll((a) => !a)} className="mt-4 text-[11px] font-bold text-violet underline underline-offset-4">
                {all ? "اعرض أقل" : `و${r.students.length - SHOWN} طالبًا آخرين · اعرض الكل`}
              </button>
            )}
            {r.students.length > 0 && <p className="mt-3 text-[11px] font-medium text-indigo-deep/55">اضغط أي طالب لترى محاولاته</p>}
          </section>

          <div className="space-y-4">
            <section className="rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-indigo-deep">نتائج التحديات حتى الآن</h2>
              <ul className="mt-3.5 space-y-3.5">
                {r.challenges.map((c) => {
                  const good = (c.pct ?? 0) >= 70;
                  return (
                    <li key={c.label}>
                      <div className="flex items-center justify-between text-[11px] font-bold text-indigo-deep">
                        <span>{c.label}</span>
                        <span className={c.pct === null ? "text-slate-400" : good ? "text-emerald-600" : "text-amber-600"}>{c.pct === null ? "لم يُطرح" : `${c.pct}%`}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${good ? "bg-mint" : "bg-amber-500"}`} style={{ width: `${c.pct ?? 0}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-[11px] font-medium leading-5 text-indigo-deep/55">من المحاولة الأولى لكل طالب، لأنها التي يُحسب منها الإتقان.</p>
            </section>

            {(stuckN > 0 || r.weakest) && (
              <section className="dots relative overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-deep to-[#4a1d96] p-5 text-white shadow-xl shadow-indigo-deep/25">
                <p className="relative text-[11px] font-semibold text-white/65">{r.lesson.dueAt && !due.late ? "قبل الموعد" : "ملاحظة"}</p>
                {stuckN > 0 && stuckAt !== null && (
                  <h2 className="relative mt-1.5 text-xl font-bold leading-snug">
                    {stuckN} من {stuck.length} متوقفون عند المحطة {stuckAt + 1} «{r.stationTitles[stuckAt]}»
                  </h2>
                )}
                {r.weakest && (
                  <p className="relative mt-2 text-xs font-medium leading-6 text-white/80">
                    {stuckN > 0 ? "و" : ""}التحدي {r.weakest.index + 1} أصاب فيه {r.weakest.pct}% فقط من المحاولة الأولى. قد تحتاج المحطة شرحًا أبسط.
                  </p>
                )}
              </section>
            )}

            <section className="rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-indigo-deep">ذكّر من لم يبدأ</h2>
              <button onClick={remind} className="mt-2.5 w-full rounded-full bg-brand py-3 text-xs font-bold text-white shadow-md shadow-violet/30 transition hover:brightness-110">
                انسخ رسالة تذكير للصف
              </button>
              <p className="mt-2 text-[11px] font-medium leading-5 text-indigo-deep/55">فيها الرمز والرابط وموعد التسليم، لتلصقها في مجموعتكم.</p>

              <h2 className="mt-5 text-sm font-bold text-indigo-deep">مدّد الموعد</h2>
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                {[
                  { d: 1, l: "يوم", w: "يومًا" },
                  { d: 2, l: "يومان", w: "يومين" },
                  { d: 7, l: "أسبوع", w: "أسبوعًا" },
                ].map((o) => (
                  <button key={o.l} onClick={() => extend(o.d, o.w)} className="rounded-xl border border-violet/15 bg-white py-2.5 text-xs font-bold text-indigo-deep transition hover:border-violet/40 hover:text-violet">
                    {o.l}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
      {toast.node}
    </>
  );
}
