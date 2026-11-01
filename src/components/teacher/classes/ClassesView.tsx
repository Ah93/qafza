"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TeacherHeader } from "../TeacherHeader";
import { useFlow } from "../FlowProvider";
import { useToast } from "../Toast";
import { Switch } from "../ui";
import {
  CLASS_KIND_LABEL,
  balanceGroups,
  classStats,
  hasPlayed,
  statusOf,
  studentsLabel,
  type ClassInfo,
} from "@/lib/classes";
import { AVATAR_COLORS, GROUP_POOL } from "@/lib/live";

function Stat({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className="rounded-3xl border border-violet/10 bg-white px-5 py-4 shadow-sm">
      <p className={`whitespace-nowrap text-[28px] font-bold leading-tight ${tone}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-indigo-deep/60">{label}</p>
    </div>
  );
}

function Avatar({ name, i }: { name: string; i: number }) {
  return (
    <span
      className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
      style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
    >
      {name[0]}
    </span>
  );
}

const COLS = "grid-cols-[1.5fr_.8fr_1.1fr_1.7fr_.7fr]";

function StudentsTable({ c }: { c: ClassInfo }) {
  return (
    <div className="rounded-3xl border border-violet/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="max-h-[520px] overflow-auto">
        <div className="min-w-[620px]">
          <div
            role="row"
            className={`sticky top-0 z-10 grid ${COLS} items-center gap-3 border-b border-violet/10 bg-white px-2 pb-3 text-[11px] font-semibold text-indigo-deep/50`}
          >
            <span>الطالب ({c.students.length})</span>
            <span>الحساب</span>
            <span>الإكمال</span>
            <span>متوسط الإتقان</span>
            <span>الحالة</span>
          </div>
          {c.students.map((s, i) => {
            const played = hasPlayed(s);
            const st = played ? statusOf(s.mastery) : null;
            const weak = played && (s.mastery ?? 0) < 60;
            return (
              <div key={s.name} role="row" className={`grid ${COLS} items-center gap-3 border-b border-violet/[0.07] px-2 py-2.5 last:border-0`}>
                <span className="flex items-center gap-2.5 text-[13px] font-bold text-indigo-deep">
                  <Avatar name={s.name} i={i} />
                  {s.name}
                </span>
                <span>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      s.registered ? "bg-mint/15 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s.registered ? "مسجّل" : "ضيف"}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-[11px] font-semibold text-indigo-deep/55">
                  <span className="flex gap-1" aria-hidden>
                    {Array.from({ length: Math.min(c.required, 12) }, (_, k) => (
                      <span key={k} className={`size-2.5 rounded-[3px] ${k < s.done ? "bg-mint" : "bg-slate-200"}`} />
                    ))}
                  </span>
                  {c.required === 0 ? "لا دروس بعد" : `${s.done} من ${c.required}`}
                </span>
                {!played ? (
                  <span className="text-[11px] font-medium text-indigo-deep/45">لم يلعب بعد</span>
                ) : (
                <span className="flex items-center gap-2.5">
                  <span className="w-9 text-[13px] font-bold text-indigo-deep">{s.mastery}%</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className={`block h-full rounded-full ${weak ? "bg-amber-500" : "bg-violet"}`}
                      style={{ width: `${s.mastery}%` }}
                    />
                  </span>
                </span>
                )}
                <span
                  className={`text-xs font-bold ${st === "متقن" ? "text-emerald-600" : st === "متعثّر" ? "text-[#c0174f]" : "text-indigo-deep/30"}`}
                >
                  {st ?? "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-violet/10 pt-4 text-[11px] font-medium leading-6 text-indigo-deep/65">
        <p>
          <b className="text-emerald-700">مسجّل:</b> له حساب، فتُحفظ نتائجه عبر كل الدروس.
        </p>
        <p>
          <b className="text-indigo-deep">ضيف:</b> دخل بالرمز واسمه الأول دون حساب. نتائجه محفوظة في هذا الصف فقط، ويصير «مسجّلًا» إن أنشأ حسابًا. وحين تشترط تسجيل الدخول لا يدخل ضيوف جدد.
        </p>
        <p>
          <b className="text-indigo-deep">الإكمال:</b> الدروس التي أنهاها من دروس هذا الصف المنشورة. تُسند الدرس إلى الصف من صفحة المشاركة.
        </p>
      </div>
    </div>
  );
}

function GroupsPanel({ c, notify }: { c: ClassInfo; notify: (m: string) => void }) {
  const { patchClass } = useFlow();
  const count = c.groups || 3;
  const [moves, setMoves] = useState<Record<string, number>>({});

  const groups = useMemo(() => {
    const base = balanceGroups(c.students, count);
    const rows: number[][] = Array.from({ length: count }, () => []);
    base.forEach((members, g) =>
      members.forEach((idx) => {
        const target = moves[c.students[idx].name] ?? g;
        rows[Math.min(target, count - 1)].push(idx);
      }),
    );
    return rows;
  }, [c.students, count, moves]);

  if (c.groups === 0) {
    return (
      <div className="grid min-h-[220px] place-items-center rounded-3xl border border-dashed border-violet/25 bg-white/60 p-8 text-center">
        <div>
          <p className="text-sm font-bold text-indigo-deep">هذا الصف بلا مجموعات</p>
          <p className="mt-1 text-[11px] text-indigo-deep/60">توزّعهم قفزة متكافئين في العدد والمستوى، وتعدّلهم متى شئت.</p>
          <button
            onClick={() => patchClass(c.id, { groups: 3 })}
            className="mt-4 rounded-full bg-brand px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-violet/30"
          >
            وزّعهم على 3 مجموعات
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-medium text-indigo-deep/65">
          موزّعة بحسب الإتقان لتتقارب في العدد والمستوى. اضغط اسم طالب لنقله إلى المجموعة التالية.
        </p>
        <button
          onClick={() => {
            setMoves({});
            notify("أُعيد التوزيع المتكافئ");
          }}
          className="rounded-full border border-violet/15 bg-white px-4 py-2 text-[11px] font-bold text-violet transition hover:border-violet/40"
        >
          أعد التوزيع
        </button>
      </div>
      <div className={`grid gap-4 ${count === 4 ? "sm:grid-cols-2" : count === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {groups.map((members, g) => {
          const played = members.filter((i) => c.students[i].mastery !== null);
          const avg = played.length ? Math.round(played.reduce((t, i) => t + (c.students[i].mastery ?? 0), 0) / played.length) : null;
          const grp = GROUP_POOL[g];
          return (
            <section key={grp.id} className="rounded-3xl border border-violet/10 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="size-3 rounded-[4px]" style={{ background: grp.color }} />
                <h3 className="text-base font-bold text-indigo-deep">مجموعة {grp.name}</h3>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-indigo-deep/55">
                {studentsLabel(members.length)} · {avg === null ? "لم يلعبوا بعد" : `إتقان ${avg}%`}
              </p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {members.map((i) => {
                  const s = c.students[i];
                  return (
                    <li key={s.name}>
                      <button
                        onClick={() => setMoves((m) => ({ ...m, [s.name]: (g + 1) % count }))}
                        title={`انقل ${s.name} إلى مجموعة ${GROUP_POOL[(g + 1) % count].name}`}
                        className="rounded-full bg-violet/[0.07] px-3 py-1.5 text-[11px] font-bold text-indigo-deep transition hover:bg-violet/15"
                      >
                        {s.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function ClassesView() {
  const { classes, reloadClasses, patchClass, selectedClass: selected, setSelectedClass: setSelected } = useFlow();
  const toast = useToast();
  const [tab, setTab] = useState<"students" | "groups">("students");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    reloadClasses();
  }, [reloadClasses]);

  const c = classes?.find((x) => x.id === selected) ?? classes?.[0];
  const stats = c ? classStats(c) : null;

  async function copyCode() {
    if (!c) return;
    try {
      await navigator.clipboard.writeText(c.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (!classes || !c) {
    return (
      <>
        <TeacherHeader />
        <main className="mx-auto grid w-full max-w-[1000px] flex-1 place-items-center px-5 py-16 text-center">
          {!classes ? (
            <p className="text-sm font-bold text-indigo-deep/50">جارٍ تحميل صفوفك…</p>
          ) : (
            <div className="max-w-sm">
              <h1 className="text-[30px] font-bold text-indigo-deep">صفوفي</h1>
              <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/65">
                الصف يجمع طلابًا تتابع تقدّمهم عبر الدروس. أنشئ صفك الأول وأعطِ طلابك رمزه ليدخلوا.
              </p>
              <Link href="/classes/new" className="mt-5 inline-block rounded-full bg-brand px-9 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30">
                أنشئ صفك الأول
              </Link>
            </div>
          )}
        </main>
      </>
    );
  }

  return (
    <>
      <TeacherHeader />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 py-7">
        <div className="grid items-start gap-6 lg:grid-cols-[230px_1fr]">
          <aside className="rounded-3xl border border-violet/10 bg-white p-4 shadow-sm">
            <h1 className="mb-3 text-[26px] font-bold text-indigo-deep">صفوفي</h1>
            <nav aria-label="الصفوف" className="space-y-1">
              {classes.map((x) => {
                const on = x.id === c.id;
                return (
                  <button
                    key={x.id}
                    aria-current={on ? "true" : undefined}
                    onClick={() => {
                      setSelected(x.id);
                      setTab("students");
                    }}
                    className={`block w-full rounded-2xl px-4 py-3 text-start transition ${on ? "bg-violet/10" : "hover:bg-violet/5"}`}
                  >
                    <span className={`block text-sm font-bold ${on ? "text-violet" : "text-indigo-deep"}`}>{x.name}</span>
                    <span className="mt-0.5 block text-[11px] font-medium text-indigo-deep/55">
                      {studentsLabel(x.students.length)} · {CLASS_KIND_LABEL[x.kind]}
                    </span>
                  </button>
                );
              })}
            </nav>
            <Link
              href="/classes/new"
              className="mt-3 block rounded-2xl border border-dashed border-violet/30 py-3 text-center text-[11px] font-bold text-violet transition hover:bg-violet/5"
            >
              + صف جديد
            </Link>
          </aside>

          <section aria-label={c.name} className="min-w-0">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[34px] font-bold leading-tight text-indigo-deep">{c.name}</h2>
                <p className="mt-1 text-xs font-semibold text-indigo-deep/60">
                  {studentsLabel(c.students.length)} · {CLASS_KIND_LABEL[c.kind]} · رمز الصف{" "}
                  <button onClick={copyCode} title="انسخ الرمز" className="font-bold text-indigo-deep">
                    <span dir="ltr">{c.code}</span>
                  </button>
                  {copied && <span className="ms-2 text-emerald-600">تم النسخ</span>}
                </p>
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-violet/10 bg-white px-4 py-2.5 shadow-sm">
                <span className="text-xs font-bold text-indigo-deep">اطلب تسجيل الدخول في هذا الصف</span>
                <Switch
                  label="اطلب تسجيل الدخول في هذا الصف"
                  checked={c.requireLogin}
                  onChange={async (v) => {
                    const ok = await patchClass(c.id, { requireLogin: v });
                    toast.show(!ok ? "تعذّر حفظ التغيير" : v ? "لن يدخل ضيوف جدد إلى هذا الصف" : "يدخل الطلاب بالرمز واسمهم الأول");
                  }}
                />
              </label>
            </div>

            {stats ? (
              <>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Stat value={stats.avg === null ? "—" : `${stats.avg}%`} label="متوسط الإتقان" tone="text-violet" />
                  <Stat value={stats.completion === null ? "—" : `${stats.completion}%`} label="نسبة الإكمال" tone="text-emerald-600" />
                  <Stat value={String(stats.struggling)} label="طلاب متعثّرون (أقل من 60%)" tone="text-[#c0174f]" />
                  <Stat value={`${stats.registered} من ${c.students.length}`} label="لهم حساب" tone="text-indigo-deep" />
                </div>
                <p className="mt-3 text-[11px] font-medium leading-6 text-indigo-deep/60">
                  متوسط إتقان الطالب = متوسط إتقانه في دروس هذا الصف، من المحاولة الأولى في كل درس. ومتوسط الصف = متوسط طلابه.
                </p>

                <div role="tablist" className="mb-4 mt-4 inline-flex rounded-full border border-violet/10 bg-white p-1 shadow-sm">
                  {([
                    ["students", "الطلاب"],
                    ["groups", "المجموعات"],
                  ] as const).map(([id, label]) => (
                    <button
                      key={id}
                      role="tab"
                      aria-selected={tab === id}
                      onClick={() => setTab(id)}
                      className={`rounded-full px-6 py-2 text-xs font-bold transition ${
                        tab === id ? "bg-indigo-deep text-white" : "text-indigo-deep/55 hover:text-indigo-deep"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {tab === "students" ? <StudentsTable c={c} /> : <GroupsPanel key={c.id} c={c} notify={toast.show} />}
              </>
            ) : (
              <div className="grid min-h-[320px] place-items-center rounded-3xl border border-dashed border-violet/25 bg-white/60 p-8 text-center">
                <div>
                  <h3 className="text-xl font-bold text-indigo-deep">لا طلاب في هذا الصف بعد</h3>
                  <p className="mx-auto mt-2 max-w-sm text-xs font-medium leading-6 text-indigo-deep/65">
                    اطلب من طلابك إدخال رمز الصف عند أول دخول، فيُضاف كل طالب تلقائيًا ويظهر هنا مع نتائجه.
                  </p>
                  <p dir="ltr" className="mt-4 text-4xl font-bold tracking-widest text-indigo-deep">
                    {c.code}
                  </p>
                  <button
                    onClick={copyCode}
                    className="mt-4 rounded-full border border-violet/15 bg-white px-5 py-2 text-xs font-bold text-violet"
                  >
                    {copied ? "تم النسخ" : "انسخ الرمز"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
      {toast.node}
    </>
  );
}
