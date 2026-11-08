"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ellipsis, Flame as FlameIcon, Orbit, Trophy, Zap, type LucideIcon } from "lucide-react";
import { useFlow } from "@/components/teacher/FlowProvider";
import { ago } from "@/lib/ago";
import { LearnHeader } from "../StudentHeader";
import { useStudent } from "../StudentProvider";

function Stat({ icon: Icon, tone, value, label }: { icon: LucideIcon; tone: string; value: string; label: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-3xl border border-violet/10 bg-white px-3 py-3 shadow-sm sm:gap-3 sm:px-4">
      <div className="min-w-0">
        <p className="truncate text-lg font-bold leading-tight text-indigo-deep sm:text-xl">{value}</p>
        <p className="text-[10px] font-semibold text-indigo-deep/50">{label}</p>
      </div>
      <span className={`hidden size-9 shrink-0 place-items-center rounded-xl sm:grid ${tone}`}>
        <Icon className="size-4" />
      </span>
    </div>
  );
}

function Art({ icon: Icon, badge, badgeCls }: { icon: LucideIcon; badge: string; badgeCls: string }) {
  return (
    <div className="dots relative h-[78px] overflow-hidden rounded-t-3xl bg-gradient-to-br from-[#241356] to-[#5b21b6]">
      <span className="absolute start-[24%] top-[26%] size-2.5 rounded-full bg-violet-300" />
      <span className="absolute bottom-[14%] end-[30%] size-3 rounded-full bg-sun" />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-brand text-white shadow-lg">
          <Icon className="size-5" />
        </span>
      </span>
      <span className={`absolute start-3 top-3 rounded-full px-3 py-1 text-[10px] font-bold ${badgeCls}`}>{badge}</span>
    </div>
  );
}

export function LearnHome() {
  const router = useRouter();
  const { account } = useFlow();
  const { name, progress } = useStudent();
  const [code, setCode] = useState("");

  const points = progress?.points ?? 0;
  const streak = progress?.streak ?? 0;
  const due = progress?.dueCount ?? 0;
  const next = progress?.inProgress ?? null;

  return (
    <>
      <LearnHeader />
      <main className="mx-auto w-full max-w-[860px] flex-1 px-5 py-6">
        {account?.role === "teach" && (
          <p role="status" className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-xs font-bold text-amber-900">
            أنت معلّم ضغطت «أتعلّم». هكذا يرى الطالب مساحته، وحسابك واحد تعلّم به وتتعلّم.
          </p>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-indigo-deep/55">أهلاً{name ? `، ${name}` : ""}</p>
            <h1 className="mt-1 text-[34px] font-bold leading-tight text-indigo-deep">ماذا ستتعلّم اليوم؟</h1>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:gap-2.5">
            <Stat icon={FlameIcon} tone="bg-orange-100 text-orange-500" value={`${streak} أيام`} label="الشعلة" />
            <Stat icon={Zap} tone="bg-mint/15 text-emerald-600" value={String(points)} label="نقطة معرفة" />
            <Stat icon={Trophy} tone="bg-amber-100 text-amber-600" value={progress?.rank ?? "مبتدئ"} label="الرتبة" />
          </div>
        </div>

        {!account && (
          <p role="status" className="mt-4 rounded-2xl border border-violet/15 bg-white px-5 py-3 text-xs font-bold text-indigo-deep">
            أنت تلعب ضيفًا. <Link href="/signup" className="text-violet underline underline-offset-4">أنشئ حسابًا</Link> لتحفظ نقاطك وشاراتك وتثبيتك اليومي.
          </p>
        )}

        <div className="mt-4 grid items-stretch gap-3 md:grid-cols-[1.9fr_1fr]">
          {progress?.reviewedToday ? (
            <section className="dots relative overflow-hidden rounded-[28px] bg-gradient-to-br from-emerald-600 to-teal-500 p-6 text-white shadow-xl shadow-emerald-700/20">
              <span className="relative inline-block rounded-full bg-white/20 px-4 py-1.5 text-[11px] font-bold">تثبيت اليوم · أُنجز ✓</span>
              <h2 className="relative mt-4 text-[26px] font-bold leading-snug">أحسنت! ثبّتّ ما نسيته اليوم.</h2>
              <p className="relative mt-1 text-xs font-medium text-white/85">شعلتك الآن {streak} أيام. نراك غدًا.</p>
            </section>
          ) : due > 0 ? (
            <section className="dots relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#b3195f] to-[#ec5d9f] p-6 text-white shadow-xl shadow-pink-700/20">
              <div className="relative flex items-center justify-between gap-3">
                <span className="rounded-full bg-white/20 px-4 py-1.5 text-[11px] font-bold">تثبيت اليوم · دقيقتان</span>
                <span className="text-xs font-bold">🔥 يحافظ على شعلتك</span>
              </div>
              <h2 className="relative mt-5 text-[28px] font-bold leading-snug">{due === 1 ? "سؤال واحد يحتاج تثبيتًا" : `${due} أسئلة تحتاج تثبيتًا`}</h2>
              <p className="relative mt-1.5 text-xs font-medium text-white/90">أخطأت فيها سابقًا، وحان وقت مراجعتها قبل أن تُنسى.</p>
              <Link href="/learn/review" className="relative mt-5 inline-block rounded-full bg-white px-7 py-2.5 text-sm font-bold text-[#a3124a] shadow-md transition hover:bg-white/90">
                ثبّتها الآن
              </Link>
            </section>
          ) : (
            <section className="dots relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#241356] to-[#5b21b6] p-6 text-white shadow-xl shadow-indigo-deep/20">
              <span className="relative inline-block rounded-full bg-white/15 px-4 py-1.5 text-[11px] font-bold">تثبيت اليوم</span>
              <h2 className="relative mt-4 text-[26px] font-bold leading-snug">لا شيء يحتاج تثبيتًا الآن.</h2>
              <p className="relative mt-1 text-xs font-medium text-white/80">كل سؤال تخطئ فيه في درس يعود إليك هنا بعد يوم، ثم بعد أيام، حتى تثبت.</p>
            </section>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/join${code ? `?code=${encodeURIComponent(code)}` : ""}`);
            }}
            className="rounded-[28px] border border-violet/10 bg-white p-5 shadow-sm"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-indigo-deep text-white">
              <Trophy className="size-4" />
            </span>
            <h2 className="mt-2 text-lg font-bold text-indigo-deep">معك رمز لعبة؟</h2>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
              dir="ltr"
              placeholder="7QK4"
              aria-label="رمز اللعبة"
              className="mt-3 w-full rounded-2xl border-2 border-violet/25 bg-white py-3 text-center text-lg font-bold tracking-widest text-indigo-deep outline-none transition placeholder:text-indigo-deep/30 focus:border-violet"
            />
            <button className="mt-2.5 w-full rounded-2xl bg-indigo-deep py-3 text-xs font-bold text-white transition hover:bg-indigo-ink">ادخل</button>
          </form>
        </div>

        {next && (
          <section className="mt-3 flex flex-wrap items-center gap-4 rounded-[28px] border border-violet/10 bg-white p-3.5 shadow-sm">
            <div className="dots relative grid h-[76px] w-[130px] shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#241356] to-[#5b21b6]">
              <span className="relative grid size-11 place-items-center rounded-2xl bg-brand text-white shadow-lg">
                <Ellipsis className="size-5" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-violet">تابع من حيث توقفت</p>
              <h2 className="truncate text-xl font-bold text-indigo-deep">{next.title}</h2>
              <p className="mt-0.5 text-[11px] font-medium text-indigo-deep/55">
                تعلّم ذاتي · المحطة {Math.min(next.total, next.reached + 1)} من {next.total}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet/10">
                <div className="h-full rounded-full bg-violet" style={{ width: `${Math.round((next.reached / next.total) * 100)}%` }} />
              </div>
            </div>
            <Link href={`/join?code=${next.code}`} className="rounded-full bg-brand px-8 py-3 text-xs font-bold text-white shadow-md shadow-violet/30 transition hover:brightness-110">
              تابع
            </Link>
          </section>
        )}

        <h2 className="mb-3 mt-6 text-xl font-bold text-indigo-deep">دروسي</h2>
        {progress && progress.history.length > 0 ? (
          <div className="grid gap-3.5 sm:grid-cols-3">
            {progress.history.slice(0, 6).map((l) => (
              <Link key={`${l.lessonId}-${l.at}`} href={`/join?code=${l.code}`} aria-label={`العب «${l.title}» مجددًا`}>
                <article className="overflow-hidden rounded-3xl border border-violet/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet/10">
                  <Art icon={l.mode === "live" ? Orbit : Ellipsis} badge={`مكتمل · ${l.accuracy}%`} badgeCls={l.accuracy >= 70 ? "bg-mint text-white" : "bg-amber-500 text-white"} />
                  <div className="p-4">
                    <h3 className="truncate text-base font-bold text-indigo-deep">{l.title}</h3>
                    <p className="mt-1 text-[11px] font-medium text-indigo-deep/55">
                      {l.mode === "live" ? "حصة مباشرة" : "تعلّم ذاتي"} · {ago(l.at)}
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-mint" style={{ width: `${l.accuracy}%` }} />
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid min-h-[150px] place-items-center rounded-3xl border border-dashed border-violet/25 bg-white/60 p-6 text-center">
            <p className="text-sm font-bold text-indigo-deep/70">لا دروس هنا بعد. حين تنهي درسًا بالرمز الذي يعطيك إياه معلّمك، يظهر في هذه القائمة.</p>
          </div>
        )}
      </main>
    </>
  );
}
