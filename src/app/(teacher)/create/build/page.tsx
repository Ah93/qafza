"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, TriangleAlert } from "lucide-react";
import { FlowHeader } from "@/components/teacher/TeacherHeader";
import { useFlow } from "@/components/teacher/FlowProvider";
import { modeLabel } from "@/lib/lesson";

/** the model gives no progress events, so the first four steps advance on a timer, and only a real answer finishes them */
const WAIT_STEP_MS = 3500;
const STATION_MS = 420;

type Phase = "working" | "revealing" | "done" | "error";

export default function BuildPage() {
  const router = useRouter();
  const { source, lesson, generate, generatedFrom } = useFlow();
  const total = lesson.stations.length;

  const [phase, setPhase] = useState<Phase>("working");
  const [step, setStep] = useState(1);
  const [shown, setShown] = useState(0);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // run (or re-run) the build
  useEffect(() => {
    if (!source) return void router.replace("/dashboard");
    // this exact source was already built (a hot reload, the back button): go straight on
    if (attempt === 0 && generatedFrom === source) return void router.replace("/create/review");

    let cancelled = false;
    generate().then((r) => {
      if (cancelled) return;
      if (!r.ok) {
        setError(r.error);
        return setPhase("error");
      }
      setTruncated(r.truncated);
      setStep(5);
      setPhase("revealing");
    });
    return () => {
      cancelled = true;
    };
    // `generate` changes when the source or choices change, which is exactly when a new build should start
  }, [attempt, source, generate, generatedFrom, router]);

  // while waiting: creep through the first four steps and hold there
  useEffect(() => {
    if (phase !== "working" || step >= 4) return;
    const t = setTimeout(() => setStep((s) => s + 1), WAIT_STEP_MS);
    return () => clearTimeout(t);
  }, [phase, step]);

  // the answer is in: show the stations one by one, then finish
  useEffect(() => {
    if (phase !== "revealing") return;
    if (shown < total) {
      const t = setTimeout(() => setShown((n) => n + 1), STATION_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setStep(6);
      setPhase("done");
    }, 300);
    return () => clearTimeout(t);
  }, [phase, shown, total]);

  // a clean build moves on by itself; a shortened one waits so the note can be read
  useEffect(() => {
    if (phase !== "done" || truncated) return;
    const t = setTimeout(() => router.push("/create/review"), 1000);
    return () => clearTimeout(t);
  }, [phase, truncated, router]);

  function retry() {
    setError("");
    setPhase("working");
    setStep(1);
    setShown(0);
    setAttempt((n) => n + 1);
  }

  const sourceLabel = source ? (source.type === "file" ? `«${source.name}»` : source.type === "text" ? "النص الذي ألصقته" : `«${source.name}»`) : "";
  const steps = [
    { title: "اقرأ المصدر", detail: sourceLabel },
    { title: "حدّد أهداف التعلّم", detail: phase === "working" ? "نستخرج الأفكار الرئيسية من المحتوى." : `${total} أهداف، وكل هدف صار محطة.` },
    { title: "اختر نمط كل محطة", detail: "لكل هدف نمط يناسب محتواه." },
    { title: "اكتب التحديات", detail: "تحدٍّ بعد كل محطة، وكل خطأ يُشرح." },
    { title: "اربط كل شيء بمصدره", detail: "كل محطة وتحدٍّ مربوط بصفحته." },
  ];

  const progress = phase === "done" ? 100 : Math.min(95, Math.round(((step - 1) / 5) * 100));
  const done = phase === "done";
  const title = source ? source.name.replace(/\.[a-z0-9]{2,4}$/i, "") : "";

  return (
    <>
      <FlowHeader current={2} />
      <main className="mx-auto grid w-full max-w-[1000px] flex-1 items-start gap-6 px-5 py-10 md:grid-cols-[1.15fr_1fr]">
        <section className="rounded-[28px] border border-violet/10 bg-white p-7 shadow-xl shadow-violet/5">
          {phase === "error" ? (
            <div role="alert">
              <span className="grid size-12 place-items-center rounded-2xl bg-rose-100 text-rose-600">
                <TriangleAlert className="size-6" />
              </span>
              <h1 className="mt-4 text-[26px] font-bold leading-snug text-indigo-deep">لم نستطع بناء الدرس</h1>
              <p className="mt-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold leading-7 text-rose-800">{error}</p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <button onClick={retry} className="rounded-full bg-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110">
                  جرّب مرة أخرى
                </button>
                <Link href="/create/customize" className="rounded-full border border-violet/15 bg-white px-6 py-3 text-sm font-bold text-violet">
                  غيّر الاختيارات
                </Link>
                <Link href="/dashboard" className="rounded-full border border-violet/15 bg-white px-6 py-3 text-sm font-bold text-violet">
                  مصدر آخر
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold text-violet">{done ? "اكتمل البناء" : `الخطوة ${Math.min(step, 5)} من 5`}</p>
              <h1 className="mt-1 text-[28px] font-bold leading-snug text-indigo-deep">{done ? `درس «${lesson.title}» جاهز` : `نبني «${title}»`}</h1>

              <div role="progressbar" aria-label="تقدّم بناء الدرس" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="mt-4 h-2.5 overflow-hidden rounded-full bg-violet/10">
                <div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${progress}%` }} />
              </div>

              <ol className="mt-6 space-y-4">
                {steps.map((s, i) => {
                  const n = i + 1;
                  const complete = step > n;
                  const active = step === n;
                  return (
                    <li key={s.title} className="flex items-start gap-3" aria-current={active ? "step" : undefined}>
                      <span
                        className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                          complete ? "bg-mint text-white" : active ? "bg-violet text-white ring-4 ring-violet/15" : "bg-violet/10 text-indigo-deep/70"
                        }`}
                      >
                        {complete ? <Check className="size-4" strokeWidth={3} /> : n}
                      </span>
                      <div className={complete || active ? "" : "opacity-45"}>
                        <p className="text-sm font-bold text-indigo-deep">{s.title}</p>
                        {(complete || active) && <p className="mt-0.5 text-xs text-indigo-deep/70">{s.detail}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {truncated && done ? (
                <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                  <p className="text-xs font-semibold leading-6 text-amber-900">
                    المصدر أطول مما نعالجه دفعة واحدة، فبنينا الدرس من أول جزء منه. يمكنك رفع بقيته درسًا ثانيًا.
                  </p>
                  <button onClick={() => router.push("/create/review")} className="mt-3 rounded-full bg-brand px-7 py-2.5 text-xs font-bold text-white shadow-md shadow-violet/30">
                    تابع إلى المراجعة
                  </button>
                </div>
              ) : (
                <p className="mt-7 rounded-2xl bg-violet/[0.06] px-4 py-3.5 text-xs font-medium leading-6 text-indigo-deep/75">
                  يستغرق عادةً أقل من دقيقة. ابقَ في هذه الصفحة حتى يجهز الدرس.
                </p>
              )}
            </>
          )}
        </section>

        <section aria-live="polite">
          <h2 className="mb-3 text-xl font-bold text-indigo-deep">المحطات</h2>
          <ul className="space-y-2.5">
            {phase !== "error" &&
              lesson.stations.slice(0, shown).map((s, i) => (
                <li key={s.id} className="flex animate-[pop_.35s_ease-out] items-center gap-3 rounded-2xl border border-violet/10 bg-white px-3.5 py-3 shadow-sm">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand text-xs font-bold text-white">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-indigo-deep">{s.title}</span>
                  <span className="shrink-0 rounded-full bg-violet/10 px-2.5 py-1 text-xs font-bold text-violet">{modeLabel(s.mode)}</span>
                </li>
              ))}
            {shown < total && (
              <li className="grid min-h-[56px] place-items-center rounded-2xl border border-dashed border-violet/25 px-4 py-4 text-xs font-medium text-indigo-deep/70">
                {phase === "error" ? "لم تُبنَ أي محطة." : "تظهر المحطات هنا واحدة واحدة."}
              </li>
            )}
          </ul>
        </section>
      </main>
    </>
  );
}
