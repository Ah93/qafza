"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Timer, Trophy, type LucideIcon } from "lucide-react";
import { FlowHeader } from "@/components/teacher/TeacherHeader";
import { DUE_DAYS, useFlow } from "@/components/teacher/FlowProvider";
import { CodeCard } from "@/components/teacher/share/CodeCard";

function Pill({
  on,
  onClick,
  disabled,
  title,
  children,
  round,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
  round?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={on}
      className={`border text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        round ? "grid size-9 place-items-center rounded-full" : "rounded-full px-4 py-2"
      } ${
        on
          ? "border-violet bg-violet/10 text-violet"
          : "border-violet/15 bg-white text-indigo-deep hover:border-violet/40"
      }`}
    >
      {children}
    </button>
  );
}

function ModeCard({
  on,
  onClick,
  icon: Icon,
  iconClass,
  title,
  body,
}: {
  on: boolean;
  onClick: () => void;
  icon: LucideIcon;
  iconClass: string;
  title: string;
  body: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`flex items-center gap-3.5 rounded-3xl border bg-white p-4 text-start transition ${
        on ? "border-violet border-2 shadow-lg shadow-violet/10" : "border-violet/10 hover:border-violet/30"
      }`}
    >
      <span className={`grid size-12 shrink-0 place-items-center rounded-2xl text-white ${iconClass}`}>
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block text-lg font-bold text-indigo-deep">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-5 text-indigo-deep/60">{body}</span>
      </span>
    </button>
  );
}

const DUES = Object.keys(DUE_DAYS);

export default function SharePage() {
  const router = useRouter();
  const { share, setShare, saved, publishShare, classes, reloadClasses } = useFlow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(to: string) {
    setBusy(true);
    setError(null);
    const r = await publishShare();
    if (!r.ok) {
      setBusy(false);
      return setError(r.error);
    }
    router.push(to);
  }

  useEffect(() => {
    reloadClasses();
  }, [reloadClasses]);

  // the code only exists once the lesson is saved: arriving without saving (a refresh) goes back to the review
  useEffect(() => {
    if (!saved) router.replace("/create/review");
  }, [saved, router]);
  const boardOnly = share.devices === "board";
  // a board-only class has no devices, so individual play cannot work
  const grouping = boardOnly ? "groups" : share.grouping;
  if (!saved) return <FlowHeader current={4} />;

  const picker = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="w-24 shrink-0 text-xs font-bold text-indigo-deep">الصف</span>
      {(classes ?? []).map((c) => (
        <Pill key={c.id} on={share.classId === c.id} onClick={() => setShare({ classId: c.id })}>
          {c.name}
        </Pill>
      ))}
      <Pill on={share.classId === ""} onClick={() => setShare({ classId: "" })}>
        بلا صف
      </Pill>
      {classes && classes.length === 0 && (
        <Link href="/classes/new" className="text-[11px] font-bold text-violet underline underline-offset-4">
          أنشئ صفًّا لتتابع نتائجه
        </Link>
      )}
    </div>
  );

  return (
    <>
      <FlowHeader current={4} />
      <main className="mx-auto grid w-full max-w-[1000px] flex-1 items-start gap-6 px-5 py-8 lg:grid-cols-[1fr_250px]">
        <div className="space-y-4">
          <h1 className="text-[34px] font-bold leading-tight text-indigo-deep">درسك جاهز. كيف ستقدّمه؟</h1>

          <div className="grid gap-3 sm:grid-cols-2">
            <ModeCard
              on={share.how === "live"}
              onClick={() => setShare({ how: "live" })}
              icon={Trophy}
              iconClass="bg-gradient-to-br from-violet to-orchid"
              title="حصة مباشرة"
              body="تقود الدرس من السبورة، وشاشات الطلاب تتبعك"
            />
            <ModeCard
              on={share.how === "self"}
              onClick={() => setShare({ how: "self" })}
              icon={Timer}
              iconClass="bg-gradient-to-br from-pink-card to-magenta"
              title="تعلّم ذاتي"
              body="كل طالب يلعب بسرعته، في الصف أو البيت"
            />
          </div>

          {share.how === "live" ? (
            <section className="rounded-[28px] border border-violet/10 bg-white p-5 shadow-xl shadow-violet/5 sm:p-6">
              <h2 className="text-lg font-bold text-indigo-deep">كيف يلعب الحاضرون؟</h2>

              <div className="mt-3 flex flex-wrap gap-2">
                <Pill on={share.devices === "devices"} onClick={() => setShare({ devices: "devices" })}>
                  بأجهزة الطلاب
                </Pill>
                <Pill on={boardOnly} onClick={() => setShare({ devices: "board" })}>
                  السبورة فقط
                </Pill>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Pill
                  on={grouping === "individual"}
                  disabled={boardOnly}
                  title={boardOnly ? "على السبورة فقط تلعب المجموعات" : undefined}
                  onClick={() => setShare({ grouping: "individual" })}
                >
                  فردي
                </Pill>
                <Pill on={grouping === "groups"} onClick={() => setShare({ grouping: "groups" })}>
                  مجموعات
                </Pill>
              </div>

              <p className="mt-3 text-[11px] font-medium leading-6 text-indigo-deep/65">
                {grouping === "groups"
                  ? boardOnly
                    ? "لصف بلا أجهزة: المجموعات ترفع بطاقات الإجابة، وتُدخل أنت النتائج على السبورة."
                    : "توزّع قفزة الطلاب على مجموعات متقاربة في العدد والمستوى، فتبقى المنافسة مفتوحة حتى النهاية."
                  : "كل طالب يلعب لنفسه. لوحة الصدارة على السبورة تُظهر الخمسة الأوائل فقط، وكل طالب يرى ترتيبه على جهازه."}
              </p>

              {grouping === "groups" && (
                <div className="mt-4 rounded-2xl bg-violet/[0.05] p-4">
                  {picker}
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="w-24 shrink-0 text-xs font-bold text-indigo-deep">عدد المجموعات</span>
                    {([2, 3, 4] as const).map((n) => (
                      <Pill key={n} round on={share.groupCount === n} onClick={() => setShare({ groupCount: n })}>
                        {n}
                      </Pill>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] font-medium leading-6 text-indigo-deep/70">
                    {share.classId === ""
                      ? "بلا صف: توزّع قفزة الطلاب على المجموعات بالتناوب عند دخولهم بالرمز."
                      : "المجموعات جاهزة من «صفوفي»، فلا تكتب شيئًا. كل طالب يجد مجموعته حين يدخل، والضيف الجديد يُضاف إلى الأقل عددًا."}
                  </p>
                  <Link
                    href="/join?code=7QK4"
                    className="mt-2 inline-block text-[11px] font-bold text-violet underline underline-offset-4"
                  >
                    شاهد كيف يدخل الطالب ويجد مجموعته
                  </Link>
                </div>
              )}

              <button
                onClick={() => go(`/live/${saved.code}`)}
                disabled={busy}
                className="mt-5 w-full rounded-full bg-brand py-4 text-base font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110"
              >
                {busy ? "جارٍ الحفظ…" : "ابدأ الحصة المباشرة"}
              </button>
            </section>
          ) : (
            <section className="rounded-[28px] border border-violet/10 bg-white p-5 shadow-xl shadow-violet/5 sm:p-6">
              <h2 className="text-lg font-bold text-indigo-deep">متى ينتهي التعلّم الذاتي؟</h2>
              <p className="mt-1 text-[11px] text-indigo-deep/60">
                يلعب كل طالب بسرعته، وتتابع أنت محاولاته ونتيجة كل تحدٍّ.
              </p>
              <div className="mt-4 rounded-2xl bg-violet/[0.05] p-4">{picker}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {DUES.map((d) => (
                  <Pill key={d} on={share.due === d} onClick={() => setShare({ due: d })}>
                    {d}
                  </Pill>
                ))}
              </div>
              <button
                onClick={() => go("/lessons/tracking")}
                disabled={busy}
                className="mt-5 w-full rounded-full bg-brand py-4 text-base font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110"
              >
                {busy ? "جارٍ الحفظ…" : "انشر للتعلّم الذاتي"}
              </button>
            </section>
          )}

          {error && (
            <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-xs font-bold text-rose-700">
              {error}
            </p>
          )}

          <label className="flex cursor-pointer items-center gap-4 rounded-3xl border border-violet/10 bg-white p-4 shadow-sm">
            <input
              type="checkbox"
              role="switch"
              checked={share.requireLogin}
              onChange={(e) => setShare({ requireLogin: e.target.checked })}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="relative h-7 w-12 shrink-0 rounded-full bg-violet/15 transition peer-checked:bg-violet peer-focus-visible:ring-4 peer-focus-visible:ring-violet/20 after:absolute after:start-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:after:start-6"
            />
            <span>
              <span className="block text-sm font-bold text-indigo-deep">اطلب من الطلاب تسجيل الدخول</span>
              <span className="mt-0.5 block text-[11px] leading-5 text-indigo-deep/60">
                {share.requireLogin
                  ? "مفعّل: لا يدخل الطالب إلا بحساب، فتُحفظ نتائجه عبر كل الدروس."
                  : "مطفأ: يدخل الطالب بالرمز واسمه الأول فقط، ويحفظ إنجازاته بحساب إن أراد."}
              </span>
            </span>
          </label>
        </div>

        <CodeCard code={saved.code} />
      </main>
    </>
  );
}
