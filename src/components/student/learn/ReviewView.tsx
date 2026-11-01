"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Logo } from "../../Logo";
import { api, postJson } from "@/lib/client-api";
import { ago } from "@/lib/ago";
import { AR_LETTERS } from "@/lib/lesson";
import { POINTS } from "@/lib/play";
import { Flame } from "../StudentHeader";
import { useStudent } from "../StudentProvider";

type Q = { id: string; title: string; question: string; options: { text: string; explanation: string }[]; correct: number; missedAt: number };

export function ReviewView() {
  const { progress, refreshProgress } = useStudent();
  const [questions, setQuestions] = useState<Q[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [streak, setStreak] = useState(progress?.streak ?? 0);

  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    api<{ questions: Q[] }>("/api/me/review").then((r) => {
      if (!live) return;
      if (r.ok) setQuestions(r.data.questions);
      else setLoadError(r.error);
    });
    return () => {
      live = false;
    };
  }, []);

  const q = questions?.[at];
  const answered = picked !== null;
  const count = questions?.length ?? 0;

  async function pick(i: number) {
    if (answered || !q) return;
    setPicked(i);
    const ok = i === q.correct;
    if (ok) setRight((r) => r + 1);
    setSaving(true);
    const r = await postJson<{ streak: number }>("/api/me/review", { id: q.id, correct: ok });
    setSaving(false);
    if (r.ok) setStreak(r.data.streak);
  }

  async function next() {
    if (at < count - 1) {
      setAt(at + 1);
      setPicked(null);
    } else {
      setFinished(true);
      await refreshProgress();
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-violet/5 bg-white/85 backdrop-blur">
        <div className="mx-auto grid h-14 max-w-[1100px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-5">
          <div className="justify-self-start">
            <Logo href="/learn" compact />
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm font-bold text-indigo-deep sm:block">تثبيت اليوم</p>
            <div className="flex gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={count} aria-valuenow={finished ? count : at}>
              {(questions ?? []).map((_, i) => (
                <span key={i} className={`h-1.5 w-7 rounded-full sm:w-9 ${i < at || finished ? "bg-violet" : i === at ? "bg-violet/60" : "bg-violet/15"}`} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 justify-self-end">
            <Flame n={streak} />
            <Link href="/learn" aria-label="أغلق التثبيت" className="grid size-9 place-items-center rounded-xl border border-violet/10 bg-white text-indigo-deep/60 shadow-sm transition hover:text-indigo-deep">
              <X className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[560px] flex-1 px-5 py-9">
        <section className="rounded-[28px] border border-violet/10 bg-white p-6 shadow-xl shadow-violet/5" aria-live="polite">
          {loadError ? (
            <p role="alert" className="py-6 text-center text-sm font-bold text-[#c0174f]">{loadError}</p>
          ) : !questions ? (
            <p role="status" className="py-8 text-center text-sm font-bold text-indigo-deep/60">جارٍ تحضير أسئلة اليوم…</p>
          ) : count === 0 ? (
            <div className="py-6 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-mint text-white">
                <Check className="size-8" strokeWidth={3} />
              </span>
              <h1 className="mt-4 text-[26px] font-bold text-indigo-deep">لا شيء يحتاج تثبيتًا اليوم</h1>
              <p className="mx-auto mt-2 max-w-xs text-xs font-medium leading-6 text-indigo-deep/65">كل سؤال تخطئ فيه في درس يعود إليك هنا بعد يوم، ثم بعد أيام، حتى يثبت.</p>
              <Link href="/learn" className="mt-5 inline-block rounded-full bg-brand px-10 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30">
                عُد إلى مساحتي
              </Link>
            </div>
          ) : !finished && q ? (
            <>
              <span className="inline-block rounded-full bg-pink-card/10 px-4 py-1.5 text-[11px] font-bold text-pink-card">أخطأت فيها {ago(q.missedAt)} · {q.title}</span>
              <h1 className="mt-3 text-[24px] font-bold leading-snug text-indigo-deep">{q.question}</h1>
              <ul className="mt-4 space-y-2.5">
                {q.options.map((o, i) => {
                  const isRight = i === q.correct;
                  const mine = picked === i;
                  const showRight = answered && isRight;
                  const wrong = mine && !isRight;
                  return (
                    <li key={i}>
                      <button
                        onClick={() => void pick(i)}
                        disabled={answered}
                        className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-start text-[15px] font-semibold text-indigo-deep transition disabled:cursor-default ${
                          showRight ? "border-mint border-2 bg-mint/10" : wrong ? "border-rose-300 bg-rose-50" : "border-violet/15 bg-white hover:border-violet/40"
                        }`}
                      >
                        <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${showRight ? "bg-mint text-white" : wrong ? "bg-rose-500 text-white" : "bg-violet/10 text-violet"}`}>
                          {showRight ? <Check className="size-4" strokeWidth={3} /> : wrong ? <X className="size-4" strokeWidth={3} /> : AR_LETTERS[i]}
                        </span>
                        {o.text}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {answered && (
                <div role="status" className={`mt-4 animate-[pop_.25s_ease-out] rounded-2xl px-4 py-3 text-[13px] font-bold ${picked === q.correct ? "bg-mint/15 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
                  {picked === q.correct ? `تذكّرتها! +${POINTS.review} نقاط.` : "ليست هذه. الصحيح ظاهر بالأخضر، وستراها مجددًا بعد أيام."}
                  {picked !== q.correct && q.options[picked!].explanation && <span className="mt-1 block font-medium">{q.options[picked!].explanation}</span>}
                </div>
              )}

              {answered && (
                <button onClick={() => void next()} disabled={saving} className="mt-4 w-full rounded-full bg-brand py-3.5 text-sm font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110 disabled:opacity-60">
                  {at === count - 1 ? "أنهِ التثبيت" : "التالي"}
                </button>
              )}
            </>
          ) : (
            <div className="py-6 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-mint text-white">
                <Check className="size-8" strokeWidth={3} />
              </span>
              <h1 className="mt-4 text-[28px] font-bold text-indigo-deep">أنهيت تثبيت اليوم</h1>
              <p className="mt-2 text-sm font-semibold text-indigo-deep/70">
                تذكّرت {right} من {count}، وربحت {right * POINTS.review} نقطة.
              </p>
              <p className="mt-1 text-xs font-medium text-indigo-deep/60">شعلتك اليومية الآن {streak} أيام.</p>
              <Link href="/learn" className="mt-5 inline-block rounded-full bg-brand px-10 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30">
                عُد إلى مساحتي
              </Link>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
