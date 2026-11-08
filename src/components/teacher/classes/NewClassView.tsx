"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { TeacherHeader } from "../TeacherHeader";
import { useFlow } from "../FlowProvider";
import { Chip, Label, Switch, fieldCls } from "../ui";
import { api } from "@/lib/client-api";
import { joinLink, type ClassKind } from "@/lib/classes";

const noop = () => () => {};

const KINDS: { label: string; kind: ClassKind }[] = [
  { label: "في مدرسة", kind: "school" },
  { label: "في جامعة", kind: "university" },
  { label: "تدريب", kind: "training" },
  { label: "تدريس خاص", kind: "private" },
];
const STAGES = ["ابتدائي", "متوسط", "ثانوي", "جامعي", "تدريب", "أخرى"];
const GROUPS = [
  { label: "بلا مجموعات", v: 0 },
  { label: "2", v: 2 },
  { label: "3", v: 3 },
  { label: "4", v: 4 },
] as const;
const ADD = [
  { id: "code", label: "ينضمون بالرمز" },
  { id: "paste", label: "الصق الأسماء" },
  { id: "platform", label: "من منصة التعلّم" },
] as const;
const PLATFORMS = ["Google Classroom", "Microsoft Teams", "Moodle"];

export function NewClassView() {
  const router = useRouter();
  const { createClass, setSelectedClass } = useFlow();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [kind, setKind] = useState<ClassKind>("school");
  const [stage, setStage] = useState("متوسط");
  const [groups, setGroups] = useState<0 | 2 | 3 | 4>(3);
  const [login, setLogin] = useState(true);
  const [add, setAdd] = useState<(typeof ADD)[number]["id"]>("code");
  const [names, setNames] = useState("");
  const [touched, setTouched] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // the permanent code is offered up front, as in the design, and claimed when the class is created
  useEffect(() => {
    api<{ code: string }>("/api/codes").then((r) => r.ok && setCode(r.data.code));
  }, []);

  // the link opens the join page of THIS site with the class code filled in
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const link = origin && code ? joinLink(origin, code) : "";
  const url = link.replace(/^https?:\/\//, "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const students = add === "paste" ? names.split(/\r?\n/).map((n) => n.trim()).filter(Boolean) : [];
    const r = await createClass({ name: name.trim(), kind, stage, subject: subject.trim(), groups, requireLogin: login, students, code } as Parameters<typeof createClass>[0]);
    if (!r.ok) {
      setBusy(false);
      return setError(r.error);
    }
    setSelectedClass(r.created.id);
    router.push("/classes");
  }

  return (
    <>
      <TeacherHeader />
      <main className="mx-auto grid w-full max-w-[1000px] flex-1 items-start gap-6 px-5 py-8 lg:grid-cols-[1fr_280px]">
        <form onSubmit={submit} className="rounded-[28px] border border-violet/10 bg-white p-6 shadow-xl shadow-violet/5 sm:p-8" noValidate>
          <h1 className="text-[34px] font-bold leading-tight text-indigo-deep">صف جديد</h1>
          <p className="mt-1.5 text-xs font-medium text-indigo-deep/70">
            الصف يجمع طلابًا تتابع تقدّمهم عبر الدروس. يمكنك أيضًا مشاركة أي درس بلا صف.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cname">اسم الصف</Label>
              <input
                id="cname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={touched && !name.trim()}
                className={`${fieldCls} ${touched && !name.trim() ? "!border-rose-400" : ""}`}
              />
              {touched && !name.trim() && <p className="mt-1.5 text-xs font-semibold text-[#c0174f]">اكتب اسمًا للصف.</p>}
            </div>
            <div>
              <Label htmlFor="csubject">المادة</Label>
              <input id="csubject" value={subject} onChange={(e) => setSubject(e.target.value)} className={fieldCls} />
            </div>
          </div>

          <div className="mt-5">
            <Label>نوع الصف</Label>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <Chip key={k.kind} on={kind === k.kind} onClick={() => setKind(k.kind)}>
                  {k.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <Label>المرحلة</Label>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <Chip key={s} on={stage === s} onClick={() => setStage(s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <Label>المجموعات</Label>
            <div className="flex flex-wrap items-center gap-2">
              {GROUPS.map((g) => (
                <Chip key={g.v} on={groups === g.v} onClick={() => setGroups(g.v)} circle={g.v !== 0}>
                  {g.label}
                </Chip>
              ))}
              <span className="ms-2 text-xs font-medium text-indigo-deep/70">توزّعهم قفزة متكافئين، وتعدّلهم متى شئت.</span>
            </div>
          </div>

          <label className="mt-5 flex cursor-pointer items-center gap-4 rounded-2xl bg-violet/[0.05] px-5 py-4">
            <Switch label="اطلب تسجيل الدخول" checked={login} onChange={setLogin} />
            <span>
              <span className="block text-sm font-bold text-indigo-deep">اطلب تسجيل الدخول</span>
              <span className="mt-0.5 block text-xs font-medium text-indigo-deep/70">
                {login ? "كل طالب بحساب، فتُحفظ نتائجه عبر الدروس." : "يدخل الطالب بالرمز واسمه الأول، وتُحفظ نتائجه في هذا الصف فقط."}
              </span>
            </span>
          </label>

          <div className="mt-5">
            <Label>أضف طلابك (اختياري)</Label>
            <div className="flex flex-wrap gap-2">
              {ADD.map((a) => (
                <Chip key={a.id} on={add === a.id} onClick={() => setAdd(a.id)}>
                  {a.label}
                </Chip>
              ))}
            </div>

            {add === "code" && (
              <p className="mt-3 text-xs font-bold text-indigo-deep/80">ينضم كل طالب بالرمز أول مرة، فيُضاف إلى الصف تلقائيًا.</p>
            )}
            {add === "paste" && (
              <div className="mt-3">
                <textarea
                  value={names}
                  onChange={(e) => setNames(e.target.value)}
                  rows={5}
                  aria-label="أسماء الطلاب"
                  placeholder={"اكتب اسمًا في كل سطر، أو الصق قائمتك:\nسارة\nعمر\nنورة"}
                  className={`${fieldCls} resize-none leading-7`}
                />
                <p className="mt-1.5 text-xs font-medium text-indigo-deep/70">
                  {names.split(/\r?\n/).filter((n) => n.trim()).length} أسماء. تُربط حساباتهم حين يدخلون بالرمز أول مرة.
                </p>
              </div>
            )}
            {add === "platform" && (
              <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                {PLATFORMS.map((p) => (
                  <li key={p} className="flex items-center justify-between rounded-2xl border border-violet/10 bg-white px-4 py-3 text-xs font-bold text-indigo-deep/70">
                    <span dir="ltr">{p}</span>
                    <span className="rounded-full bg-violet/10 px-2.5 py-0.5 text-xs text-violet">قريبًا</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="mt-6 w-full rounded-full bg-brand py-4 text-base font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "جارٍ الإنشاء…" : "أنشئ الصف"}
          </button>
        </form>

        <aside className="dots relative overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-deep to-[#4a1d96] p-6 text-center text-white shadow-xl shadow-indigo-deep/25 lg:sticky lg:top-20">
          <p className="relative text-xs font-medium text-white/70">رمز الصف الدائم</p>
          <p dir="ltr" className="relative mt-1 text-[44px] font-bold leading-tight tracking-wider">
            {code || "····"}
          </p>
          <div className="relative mx-auto mt-3 grid size-[136px] place-items-center rounded-2xl bg-white p-3">
            {code ? <QRCodeSVG value={link || code} size={112} level="M" fgColor="#1b0f3d" title={`رمز QR للصف ${code}`} /> : null}
          </div>
          <p dir="ltr" className="relative mt-3 text-xs font-bold text-white/90">
            {url}
          </p>
          <p className="relative mt-3 text-xs font-medium leading-6 text-white/75">
            يختلف عن رمز الدرس: رمز الصف يضمّ الطالب إلى صفك مرة واحدة، ورمز الدرس يُدخله درسًا بعينه.
          </p>
        </aside>
      </main>
    </>
  );
}
