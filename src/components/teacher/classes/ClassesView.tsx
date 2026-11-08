"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { TeacherHeader } from "../TeacherHeader";
import { useFlow } from "../FlowProvider";
import { useToast } from "../Toast";
import { Chip, Label, Switch, fieldCls } from "../ui";
import {
  CLASS_KIND_LABEL,
  STRUGGLE_CHOICES,
  balanceGroups,
  joinLink,
  classStats,
  hasPlayed,
  statusOf,
  studentsLabel,
  type ClassInfo,
  type ClassKind,
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
            const st = played ? statusOf(s.mastery, c.struggleBelow) : null;
            const weak = played && (s.mastery ?? 0) < c.struggleBelow;
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
  const { patchClass, moveStudent, resetGroups } = useFlow();
  const count = c.groups || 3;
  const [menu, setMenu] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // placements the teacher made by hand come from the server, so the live lesson deals the same groups
  const groups = useMemo(() => balanceGroups(c.students, count), [c.students, count]);
  const pinned = c.students.filter((s) => s.group !== null && s.group < count).length;

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

  async function place(studentId: string, name: string, group: number | null) {
    setMenu(null);
    setBusy(true);
    const ok = await moveStudent(c.id, studentId, group);
    setBusy(false);
    notify(!ok ? "تعذّر نقل الطالب" : group === null ? `${name} عاد إلى التوزيع التلقائي` : `نُقل ${name} إلى مجموعة ${GROUP_POOL[group].name}`);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-[11px] font-medium leading-5 text-indigo-deep/65">
          موزّعة بحسب الإتقان لتتقارب في العدد والمستوى. اضغط اسم طالب لتختار له المجموعة التي تريدها، وسيبقى فيها، وتوزّع قفزة الباقين حوله.
        </p>
        <button
          disabled={busy || pinned === 0}
          onClick={async () => {
            setBusy(true);
            const ok = await resetGroups(c.id);
            setBusy(false);
            notify(ok ? "أُعيد التوزيع المتكافئ لكل الطلاب" : "تعذّرت إعادة التوزيع");
          }}
          className="rounded-full border border-violet/15 bg-white px-4 py-2 text-[11px] font-bold text-violet transition hover:border-violet/40 disabled:opacity-50"
        >
          أعد التوزيع{pinned ? ` (يلغي ${pinned} نقلًا)` : ""}
        </button>
      </div>
      <div className={`grid grid-cols-1 gap-4 ${count === 4 ? "sm:grid-cols-2" : count === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {groups.map((members, g) => {
          const played = members.filter((i) => c.students[i].mastery !== null);
          const avg = played.length ? Math.round(played.reduce((t, i) => t + (c.students[i].mastery ?? 0), 0) / played.length) : null;
          const grp = GROUP_POOL[g];
          return (
            <section key={grp.id} className="min-w-0 rounded-3xl border border-violet/10 bg-white p-4 shadow-sm">
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
                  const by = s.group !== null && s.group < count;
                  return (
                    <li key={s.id} className="relative">
                      <button
                        onClick={() => setMenu(menu === s.id ? null : s.id)}
                        aria-expanded={menu === s.id}
                        aria-haspopup="menu"
                        title={by ? "وضعته بيدك في هذه المجموعة" : "اضغط لتنقله إلى مجموعة أخرى"}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-bold text-indigo-deep transition hover:bg-violet/15 ${by ? "bg-violet/15 ring-1 ring-violet/40" : "bg-violet/[0.07]"}`}
                      >
                        {by && <span aria-hidden className="me-1 text-violet">●</span>}
                        {s.name}
                      </button>
                      {menu === s.id && (
                        <>
                          <button aria-label="إغلاق" className="fixed inset-0 z-20 cursor-default" onClick={() => setMenu(null)} />
                          <div role="menu" className="absolute start-0 top-full z-30 mt-1.5 min-w-[190px] rounded-2xl border border-violet/10 bg-white p-1.5 shadow-xl shadow-indigo-deep/15">
                            <p className="px-3 pb-1 pt-1.5 text-[10px] font-bold text-indigo-deep/50">انقل {s.name} إلى</p>
                            {Array.from({ length: count }, (_, t) => (
                              <button
                                key={t}
                                role="menuitem"
                                disabled={t === g}
                                onClick={() => place(s.id, s.name, t)}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-start text-xs font-bold text-indigo-deep transition hover:bg-violet/[0.07] disabled:opacity-40"
                              >
                                <span className="size-2.5 rounded-[3px]" style={{ background: GROUP_POOL[t].color }} />
                                مجموعة {GROUP_POOL[t].name}
                                {t === g && <span className="ms-auto text-[10px] font-medium text-indigo-deep/50">الحالية</span>}
                              </button>
                            ))}
                            {by && (
                              <button role="menuitem" onClick={() => place(s.id, s.name, null)} className="mt-0.5 w-full rounded-xl border-t border-violet/10 px-3 py-2 text-start text-[11px] font-bold text-violet transition hover:bg-violet/[0.07]">
                                أعده إلى التوزيع التلقائي
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      {pinned > 0 && <p className="mt-3 text-[11px] font-medium text-indigo-deep/55">● الطلاب المعلَّمون وضعتهم بيدك، ويبقون في مجموعاتهم في الحصص المباشرة.</p>}
    </div>
  );
}

/** the class's details, editable after it was made */
function EditClass({ c, onClose, notify }: { c: ClassInfo; onClose: () => void; notify: (m: string) => void }) {
  const { patchClass } = useFlow();
  const [name, setName] = useState(c.name);
  const [subject, setSubject] = useState(c.subject);
  const [kind, setKind] = useState<ClassKind>(c.kind);
  const [stage, setStage] = useState(c.stage);
  const [groups, setGroups] = useState<ClassInfo["groups"]>(c.groups);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const ok = await patchClass(c.id, { name: name.trim(), subject: subject.trim(), kind, stage, groups });
    setBusy(false);
    notify(ok ? "حُفظت بيانات الصف" : "تعذّر حفظ التغييرات");
    if (ok) onClose();
  }

  const KINDS: { label: string; kind: ClassKind }[] = [
    { label: "في مدرسة", kind: "school" },
    { label: "في جامعة", kind: "university" },
    { label: "تدريب", kind: "training" },
    { label: "تدريس خاص", kind: "private" },
  ];
  const STAGES = ["ابتدائي", "متوسط", "ثانوي", "جامعي", "تدريب", "أخرى"];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-indigo-deep/40 p-5 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form ref={ref} onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="edit-class" className="w-full max-w-[480px] animate-[pop_.3s_ease-out] rounded-[28px] bg-white p-6 shadow-2xl shadow-indigo-deep/30">
        <h2 id="edit-class" className="text-2xl font-bold text-indigo-deep">تعديل بيانات الصف</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="ename">اسم الصف</Label>
            <input id="ename" data-autofocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={fieldCls} />
          </div>
          <div>
            <Label htmlFor="esubject">المادة</Label>
            <input id="esubject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={40} className={fieldCls} />
          </div>
        </div>
        <div className="mt-3">
          <Label>نوع الصف</Label>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <Chip key={k.kind} on={kind === k.kind} onClick={() => setKind(k.kind)}>
                {k.label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <Label>المرحلة</Label>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((x) => (
              <Chip key={x} on={stage === x} onClick={() => setStage(x)}>
                {x}
              </Chip>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <Label>عدد المجموعات</Label>
          <div className="flex flex-wrap gap-2">
            {([0, 2, 3, 4] as const).map((g) => (
              <Chip key={g} on={groups === g} onClick={() => setGroups(g)} circle={g !== 0}>
                {g === 0 ? "بلا مجموعات" : g}
              </Chip>
            ))}
          </div>
        </div>
        <p className="mt-3 text-[11px] font-medium leading-5 text-indigo-deep/55">رمز الصف ثابت ولا يتغيّر، فلا ينقطع عنه طلابك.</p>
        <div className="mt-5 flex gap-2.5">
          <button disabled={busy || !name.trim()} className="flex-1 rounded-full bg-brand py-3 text-sm font-bold text-white shadow-lg shadow-violet/30 disabled:opacity-50">
            {busy ? "جارٍ الحفظ…" : "احفظ"}
          </button>
          <button type="button" onClick={onClose} className="rounded-full border border-violet/15 px-6 py-3 text-xs font-bold text-violet">
            تراجع
          </button>
        </div>
      </form>
    </div>
  );
}

const noop = () => () => {};

export function ClassesView() {
  const { classes, reloadClasses, patchClass, selectedClass: selected, setSelectedClass: setSelected } = useFlow();
  const toast = useToast();
  const [tab, setTab] = useState<"students" | "groups">("students");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [editing, setEditing] = useState(false);
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");

  useEffect(() => {
    reloadClasses();
  }, [reloadClasses]);

  const c = classes?.find((x) => x.id === selected) ?? classes?.[0];
  const stats = c ? classStats(c) : null;

  async function copy(what: "code" | "link") {
    if (!c) return;
    try {
      await navigator.clipboard.writeText(what === "code" ? c.code : joinLink(origin, c.code));
      setCopied(what);
      setTimeout(() => setCopied(null), 1600);
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
                  <button onClick={() => copy("code")} title="انسخ الرمز" className="font-bold text-indigo-deep">
                    <span dir="ltr">{c.code}</span>
                  </button>
                  {copied && <span className="ms-2 text-emerald-600">تم النسخ</span>}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button onClick={() => copy("link")} className="rounded-full border border-violet/15 bg-white px-4 py-1.5 text-[11px] font-bold text-violet transition hover:border-violet/40">
                    {copied === "link" ? "تم نسخ الرابط" : "انسخ رابط الصف"}
                  </button>
                  <button onClick={() => setEditing(true)} className="rounded-full border border-violet/15 bg-white px-4 py-1.5 text-[11px] font-bold text-violet transition hover:border-violet/40">
                    تعديل بيانات الصف
                  </button>
                </div>
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
                  <div className="rounded-3xl border border-violet/10 bg-white px-5 py-4 shadow-sm">
                    <p className="text-[28px] font-bold leading-tight text-[#c0174f]">{stats.struggling}</p>
                    <label className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] font-semibold text-indigo-deep/60">
                      طلاب متعثّرون (أقل من
                      <select
                        value={c.struggleBelow}
                        onChange={async (e) => {
                          const line = Number(e.target.value); // read now: the box shows the old value again until the save lands
                          const ok = await patchClass(c.id, { struggleBelow: line });
                          toast.show(ok ? `المتعثّر عندك من يقلّ إتقانه عن ${line}%` : "تعذّر حفظ التغيير");
                        }}
                        aria-label="حدّ التعثّر بالنسبة المئوية"
                        className="rounded-lg border border-violet/20 bg-violet/[0.05] px-1.5 py-0.5 text-[11px] font-bold text-violet outline-none focus:border-violet"
                      >
                        {[...new Set([...STRUGGLE_CHOICES, c.struggleBelow])].sort((a, b) => a - b).map((n) => (
                          <option key={n} value={n}>
                            {n}%
                          </option>
                        ))}
                      </select>
                      )
                    </label>
                  </div>
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
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button onClick={() => copy("code")} className="rounded-full border border-violet/15 bg-white px-5 py-2 text-xs font-bold text-violet">
                      {copied === "code" ? "تم النسخ" : "انسخ الرمز"}
                    </button>
                    <button onClick={() => copy("link")} className="rounded-full border border-violet/15 bg-white px-5 py-2 text-xs font-bold text-violet">
                      {copied === "link" ? "تم نسخ الرابط" : "انسخ رابط الصف"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
      {editing && <EditClass c={c} onClose={() => setEditing(false)} notify={toast.show} />}
      {toast.node}
    </>
  );
}
