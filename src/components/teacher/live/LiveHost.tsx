"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client-api";
import { AR_LETTERS, CHALLENGE_LABELS, type Lesson } from "@/lib/lesson";
import { ANSWER_CARDS, GROUP_POOL } from "@/lib/live";
import { buildSlides, POINTS_RIGHT, type Slide, type TeacherSnap } from "@/lib/live-flow";
import { TeacherHeader } from "../TeacherHeader";
import { ArenaBoard, BoardOnlyArena, BossBoard, ChallengeBoard, ExplainBoard, FinishBoard, LeaderPill, ScorePills } from "./boards";

type Reply = { snap: TeacherSnap };
const post = (code: string, body: Record<string, unknown>) =>
  api<Reply>(`/api/live/${code}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

function Counter({ answered, total }: { answered: number; total: number }) {
  const pct = total ? Math.round((answered / total) * 100) : 0;
  return (
    <div className="rounded-2xl bg-violet/[0.06] p-3.5">
      <div className="flex items-center justify-between text-xs font-bold text-indigo-deep">
        <span>أجابوا</span>
        <span>
          {answered} من {total}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-violet/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="نسبة من أجاب">
        <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Distribution({ counts, labels }: { counts: number[]; labels: string[] }) {
  const max = Math.max(1, ...counts);
  return (
    <div className="rounded-2xl bg-violet/[0.06] p-3.5">
      <h3 className="text-xs font-bold text-indigo-deep">ماذا اختاروا</h3>
      <ul className="mt-2.5 space-y-2">
        {counts.map((n, i) => (
          <li key={i} className="flex items-center gap-2.5 text-[11px] font-bold text-indigo-deep">
            <span className="grid size-6 shrink-0 place-items-center rounded-lg text-white" style={{ background: ANSWER_CARDS[counts.length === 2 ? 4 + i : i].color }}>
              {labels[i]}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-violet/10">
              <span className="block h-full rounded-full bg-violet transition-[width] duration-500" style={{ width: `${(n / max) * 100}%` }} />
            </span>
            <span className="w-5 text-end">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LiveHost({ lesson, code }: { lesson: Lesson; code: string }) {
  const [snap, setSnap] = useState<TeacherSnap | null>(null);
  const [problem, setProblem] = useState<{ text: string; status: number } | null>(null);
  const [lost, setLost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);

  const total = lesson.stations.length;
  const slides = useMemo<Slide[]>(() => buildSlides(total), [total]);

  // open (or re-attach to) the session, then follow it
  useEffect(() => {
    let es: EventSource | null = null;
    let live = true;
    const t = setTimeout(() => setOrigin(window.location.origin), 0);
    post(code, { action: "open" }).then((r) => {
      if (!live) return;
      if (!r.ok) return setProblem({ text: r.error, status: r.status });
      setSnap(r.data.snap);
      es = new EventSource(`/api/live/${code}/events?role=teacher`);
      es.onmessage = (e) => {
        try {
          setSnap(JSON.parse(e.data) as TeacherSnap);
          setLost(false);
        } catch {}
      };
      es.onerror = () => setLost(true);
    });
    return () => {
      live = false;
      clearTimeout(t);
      es?.close();
    };
  }, [code]);

  const act = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      const r = await post(code, body);
      setBusy(false);
      if (r.ok) setSnap(r.data.snap);
      else setProblem({ text: r.error, status: r.status });
    },
    [code],
  );

  if (problem) {
    return (
      <>
        <TeacherHeader />
        <main className="grid flex-1 place-items-center px-5 py-16 text-center">
          <div role="alert" className="max-w-sm">
            <h1 className="text-2xl font-bold text-indigo-deep">تعذّر فتح الحصة</h1>
            <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/65">{problem.text}</p>
            <Link href={problem.status === 401 ? "/login" : problem.status === 409 ? "/create/share" : "/lessons"} className="mt-5 inline-block rounded-full bg-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30">
              {problem.status === 401 ? "تسجيل الدخول" : problem.status === 409 ? "إلى صفحة النشر" : "إلى دروسي"}
            </Link>
          </div>
        </main>
      </>
    );
  }
  if (!snap) {
    return (
      <>
        <TeacherHeader />
        <main className="grid flex-1 place-items-center px-5 py-16">
          <p role="status" className="text-sm font-bold text-indigo-deep/60">جارٍ فتح الحصة…</p>
        </main>
      </>
    );
  }

  const boardOnly = snap.boardOnly;
  const mode = snap.mode;
  const ended = snap.status === "ended";
  const groups = GROUP_POOL.slice(0, snap.groupCount);
  const at = snap.at;
  const slide = slides[at];
  const online = snap.students.filter((s) => s.online);
  const count = boardOnly ? snap.rosterSize : snap.students.length;
  const sizes = groups.map((_, i) => snap.groups[i]?.size ?? 0);
  const className = snap.className ?? "بلا صف";

  const scoreRight =
    mode === "groups" ? <ScorePills groups={groups} scores={groups.map((_, i) => snap.groups[i]?.score ?? 0)} /> : snap.top[0] ? <LeaderPill name={snap.top[0].name} score={snap.top[0].points} /> : null;

  const go = (to: number) => act({ action: "goto", at: Math.max(0, Math.min(slides.length - 1, to)) });
  const station = "i" in slide && slide.i < total ? lesson.stations[slide.i] : null;
  const isBoss = "i" in slide && slide.i === total;
  const planIndex = slide.kind === "arena" ? 0 : slide.kind === "finish" ? total : "i" in slide ? slide.i : 0;
  const last = slides[at + 1]?.kind === "finish";

  const phaseTabs = boardOnly ? ["الساحة", "الشرح", "التحدي", "الكشف", "الختام"] : ["الساحة", "الشرح", "التحدي", "الختام"];
  const activeTab = slide.kind === "arena" ? "الساحة" : slide.kind === "explain" ? "الشرح" : slide.kind === "challenge" ? "التحدي" : slide.kind === "reveal" ? (boardOnly ? "الكشف" : "التحدي") : "الختام";
  const goTab = (tab: string) => {
    const from = "i" in slide ? slide.i : 0;
    const find = (k: Slide["kind"]) => {
      const idx = slides.findIndex((s) => s.kind === k && (!("i" in s) || s.i >= from));
      return idx === -1 ? slides.findIndex((s) => s.kind === k) : idx;
    };
    go(tab === "الساحة" ? 0 : tab === "الشرح" ? find("explain") : tab === "التحدي" ? find("challenge") : tab === "الكشف" ? find("reveal") : slides.length - 1);
  };

  async function finish() {
    setConfirmEnd(false);
    await act({ action: "goto", at: slides.length - 1 });
    await act({ action: "end" });
  }

  const nextLabel =
    slide.kind === "arena" ? "ابدأ الحصة" : slide.kind === "explain" ? "اعرض التحدي" : slide.kind === "challenge" ? "اكشف الإجابة" : slide.kind === "reveal" ? (last ? "اختم الحصة" : slides[at + 1]?.kind === "challenge" ? "تحدّي الزعيم" : "المحطة التالية") : "";

  /* ---------- board ---------- */

  let board: React.ReactNode;
  if (slide.kind === "arena") {
    board = boardOnly ? (
      <BoardOnlyArena lesson={lesson} groups={groups} sizes={sizes} />
    ) : (
      <ArenaBoard code={code} url={origin ? `${origin}/join?code=${code}` : undefined} mode={mode} count={count} groups={groups} sizes={sizes} names={snap.students.map((s) => s.name).slice(0, 8)} />
    );
  } else if (slide.kind === "explain" && station) {
    board = <ExplainBoard station={station} index={slide.i} total={total} right={scoreRight} />;
  } else if ((slide.kind === "challenge" || slide.kind === "reveal") && station) {
    board = <ChallengeBoard challenge={station.challenge} label={`${slide.kind === "reveal" ? "الكشف" : "التحدي"} ${slide.i + 1} · ${CHALLENGE_LABELS[station.challenge.kind]}`} reveal={slide.kind === "reveal"} right={scoreRight} />;
  } else if ((slide.kind === "challenge" || slide.kind === "reveal") && isBoss) {
    board = <BossBoard items={lesson.boss} reveal={slide.kind === "reveal"} right={scoreRight} />;
  } else {
    const rows =
      mode === "groups"
        ? groups.map((g, i) => ({ name: g.name, score: snap.groups[i]?.score ?? 0, color: g.color })).sort((a, b) => b.score - a.score)
        : snap.top.map((s, i) => ({ name: s.name, score: s.points, color: GROUP_POOL[i % 4].color }));
    board = <FinishBoard rows={rows} mode={mode} />;
  }

  /* ---------- panel ---------- */

  const arenaNote = boardOnly
    ? `الصف: ${className} · ${snap.groupCount} مجموعات من «صفوفي». لا يحتاج الطلاب أجهزة ولا رمزًا.`
    : mode === "individual"
      ? "كل طالب يلعب لنفسه. لوحة الصدارة على السبورة تُظهر الخمسة الأوائل فقط، وكل طالب يرى ترتيبه على جهازه."
      : snap.className
        ? "المجموعات جاهزة من «صفوفي»: متكافئة في العدد ومستوى الإتقان. ومن يدخل ضيفًا جديدًا يُضاف إلى المجموعة الأقل عددًا."
        : "بلا صف: توزّع قفزة الطلاب على المجموعات عند دخولهم، ومن يدخل يُضاف إلى المجموعة الأقل عددًا.";

  const showAwards = slide.kind !== "arena" && slide.kind !== "finish" && !ended;
  const flags = "i" in slide ? (snap.flags[slide.i] ?? groups.map(() => false)) : [];

  const panel = (
    <aside className="rounded-[28px] border border-violet/10 bg-white p-5 shadow-xl shadow-violet/5">
      <span className="inline-block rounded-full bg-indigo-deep px-3.5 py-1.5 text-[11px] font-bold text-white">لوحة المعلّم، لا تظهر على السبورة</span>
      <h2 className="mt-3 text-2xl font-bold text-indigo-deep">
        {slide.kind === "arena" ? "قبل أن تبدأ" : slide.kind === "finish" ? (ended ? "انتهت الحصة" : "الختام") : isBoss ? "تحدّي الزعيم" : `المحطة ${planIndex + 1} من ${total}`}
      </h2>

      {lost && (
        <p role="alert" className="mt-3 rounded-xl bg-amber-50 px-3.5 py-2 text-[11px] font-bold text-amber-900">
          انقطع الاتصال بالخادم، نحاول مجددًا…
        </p>
      )}

      {slide.kind === "arena" && (
        <>
          <p className="mt-3 rounded-2xl bg-violet/[0.06] px-4 py-3 text-xs font-medium leading-6 text-indigo-deep/85">{arenaNote}</p>
          {!boardOnly && (
            <p className="mt-3 text-xs font-bold text-indigo-deep" aria-live="polite">
              {online.length === 0 ? "لم يدخل أحد بعد. اعرض الرمز والـQR على السبورة." : `${online.length} متصلون الآن من ${snap.students.length}`}
            </p>
          )}
          {boardOnly && (
            <div className="mt-3 rounded-2xl bg-violet/[0.06] p-4">
              <h3 className="text-sm font-bold text-indigo-deep">بطاقات الإجابة</h3>
              <p className="mt-1.5 text-[11px] font-medium leading-6 text-indigo-deep/65">طقم لكل مجموعة: أ ب ج د، وصح وخطأ. ترفع المجموعة بطاقتها بعد التشاور.</p>
              <div className="mt-3 flex flex-wrap gap-2" dir="rtl">
                {ANSWER_CARDS.map((c) => (
                  <span key={c.label} className="grid h-10 min-w-10 place-items-center rounded-xl px-2.5 text-sm font-bold text-white shadow-sm" style={{ background: c.color }}>
                    {c.label}
                  </span>
                ))}
              </div>
              <button onClick={() => window.print()} className="mt-3 w-full rounded-xl border border-violet/10 bg-white py-2.5 text-xs font-bold text-violet transition hover:border-violet/30">
                اطبع بطاقات الإجابة
              </button>
              <p className="mt-2.5 text-[11px] font-medium leading-6 text-indigo-deep/60">لا طابعة؟ يكفي أن تكتب المجموعة الحرف على ورقة، أو أن ترفع أصابعها: 1 إلى 4.</p>
            </div>
          )}
        </>
      )}

      {slide.kind === "explain" && !boardOnly && (
        <p className={`mt-3 rounded-2xl px-4 py-3 text-xs font-bold leading-6 ${snap.repeats > 0 ? "bg-amber-50 text-amber-900" : "bg-violet/[0.06] text-indigo-deep/70"}`} aria-live="polite">
          {snap.repeats > 0 ? `${snap.repeats} من الطلاب طلبوا إعادة الشرح.` : "لم يطلب أحد إعادة الشرح."}
        </p>
      )}

      {slide.kind === "challenge" && (
        <div className="mt-3 space-y-3">
          {!boardOnly && <Counter answered={snap.answered} total={snap.students.length} />}
          {!boardOnly && snap.distribution && <Distribution counts={snap.distribution} labels={snap.distribution.length === 2 ? ["صح", "خطأ"] : AR_LETTERS.slice(0, 4)} />}
          {boardOnly && (
            <div className="rounded-2xl bg-violet/[0.06] p-4">
              <h3 className="text-sm font-bold text-indigo-deep">أدخل إجابات المجموعات</h3>
              <p className="mt-1 text-[11px] text-indigo-deep/60">
                حدّد المجموعات التي أجابت صحيحًا: +{isBoss ? POINTS_RIGHT * 2 : POINTS_RIGHT} نقاط لكل منها.
              </p>
              <ul className="mt-3 space-y-2">
                {groups.map((g, i) => {
                  const on = Boolean(flags[i]);
                  return (
                    <li key={g.id}>
                      <button
                        aria-pressed={on}
                        disabled={busy}
                        onClick={() => act({ action: "flag", challenge: (slide as { i: number }).i, group: i, value: !on })}
                        className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${on ? "border-mint bg-mint/10 text-emerald-700" : "border-violet/10 bg-white text-indigo-deep"}`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="size-2.5 rounded-[3px]" style={{ background: g.color }} />
                          {g.name}
                        </span>
                        <span>{on ? "صحيحة ✓" : "لم تُحسب"}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {slide.kind === "reveal" && (
        <div className="mt-3 rounded-2xl bg-mint/10 p-4">
          <h3 className="text-sm font-bold text-emerald-800">{boardOnly ? "نتيجة هذا التحدي" : "الترتيب الآن"}</h3>
          <ul className="mt-2 space-y-1.5 text-xs font-semibold text-emerald-900">
            {boardOnly ? (
              groups.map((g, i) => (
                <li key={g.id} className="flex items-center justify-between">
                  <span>{g.name}</span>
                  <span>{flags[i] ? `+${isBoss ? POINTS_RIGHT * 2 : POINTS_RIGHT}` : "0"}</span>
                </li>
              ))
            ) : mode === "groups" ? (
              [...snap.groups].sort((a, b) => b.score - a.score).map((g) => (
                <li key={g.group} className="flex items-center justify-between">
                  <span>{GROUP_POOL[g.group % 4].name}</span>
                  <span>{g.score}</span>
                </li>
              ))
            ) : snap.top.length ? (
              snap.top.map((t, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span>{i + 1}. {t.name}</span>
                  <span>{t.points}</span>
                </li>
              ))
            ) : (
              <li>لا طلاب في الحصة.</li>
            )}
          </ul>
        </div>
      )}

      {slide.kind === "finish" && (
        <p className="mt-3 rounded-2xl bg-violet/[0.06] px-4 py-3 text-xs font-medium leading-6 text-indigo-deep/85">
          {ended ? "حُفظت النتائج. نتائج الصف وفجوات الفهم جاهزة في صفحة النتائج." : "اضغط «اختم الحصة» لتحفظ النتائج وتُغلق الحصة لجميع الطلاب."}
        </p>
      )}

      {showAwards && (
        <details className="mt-3 rounded-2xl bg-violet/[0.06] p-3.5">
          <summary className="cursor-pointer text-xs font-bold text-indigo-deep">مكافأة (+5 نقاط)</summary>
          <ul className="mt-3 space-y-1.5">
            {mode === "groups" &&
              groups.map((g, i) => (
                <li key={g.id}>
                  <button onClick={() => act({ action: "award", group: i, points: 5 })} className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-indigo-deep">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-[3px]" style={{ background: g.color }} />
                      مجموعة {g.name}
                    </span>
                    <span className="text-violet">+5</span>
                  </button>
                </li>
              ))}
            {!boardOnly &&
              snap.students.slice(0, 12).map((s) => (
                <li key={s.id}>
                  <button onClick={() => act({ action: "award", student: s.id, points: 5 })} className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-indigo-deep">
                    <span className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${s.online ? "bg-mint" : "bg-slate-300"}`} aria-label={s.online ? "متصل" : "غير متصل"} />
                      {s.name}
                    </span>
                    <span className="text-violet">+5</span>
                  </button>
                </li>
              ))}
          </ul>
        </details>
      )}

      <h3 className="mt-5 text-xs font-bold text-indigo-deep">خطة الحصة</h3>
      <ol className="mt-2 space-y-1">
        {lesson.stations.map((s, i) => {
          const on = slide.kind !== "arena" && slide.kind !== "finish" && planIndex === i;
          return (
            <li key={s.id}>
              <button
                disabled={ended}
                onClick={() => go(slides.findIndex((x) => x.kind === "explain" && x.i === i))}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-xs font-bold transition ${on ? "bg-violet/10 text-violet" : "text-indigo-deep/55 hover:bg-violet/5"}`}
              >
                <span className={`grid size-5 place-items-center rounded-full text-[10px] ${on ? "bg-violet text-white" : "bg-violet/10 text-indigo-deep/55"}`}>{i + 1}</span>
                {s.title}
              </button>
            </li>
          );
        })}
        <li>
          <button
            disabled={ended}
            onClick={() => go(slides.findIndex((x) => x.kind === "challenge" && x.i === total))}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-xs font-bold transition ${isBoss ? "bg-pink-card/10 text-pink-card" : "text-indigo-deep/55 hover:bg-violet/5"}`}
          >
            <span className="grid size-5 place-items-center rounded-full bg-violet/10 text-[10px]">★</span>
            تحدّي الزعيم
          </button>
        </li>
      </ol>

      <div className="mt-4 flex gap-2.5">
        {ended ? (
          <Link href={`/results?code=${code}`} className="block w-full rounded-full bg-brand py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-violet/30">
            عرض النتائج
          </Link>
        ) : slide.kind === "finish" ? (
          <button disabled={busy} onClick={finish} className="flex-1 rounded-full bg-brand py-3.5 text-sm font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110 disabled:opacity-60">
            اختم الحصة واحفظ النتائج
          </button>
        ) : (
          <>
            <button
              disabled={busy}
              onClick={() => (last ? finish() : go(at + 1))}
              className="flex-1 rounded-full bg-brand py-3.5 text-sm font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110 disabled:opacity-60"
            >
              {nextLabel}
            </button>
            {slide.kind !== "arena" && (
              <button disabled={busy} onClick={() => go(at - 1)} className="rounded-full border border-violet/15 bg-white px-5 text-xs font-bold text-violet">
                السابق
              </button>
            )}
          </>
        )}
      </div>

      {!ended && (
        <div className="mt-3 text-center">
          {confirmEnd ? (
            <p className="text-[11px] font-bold text-indigo-deep">
              تنهي الحصة الآن وتحفظ النتائج؟{" "}
              <button className="text-[#c0174f] underline underline-offset-4" onClick={finish}>
                نعم، أنهِها
              </button>{" "}
              ·{" "}
              <button className="text-violet underline underline-offset-4" onClick={() => setConfirmEnd(false)}>
                لا
              </button>
            </p>
          ) : (
            <button className="text-[11px] font-bold text-indigo-deep/50 underline underline-offset-4 hover:text-indigo-deep" onClick={() => setConfirmEnd(true)}>
              إنهاء الحصة الآن
            </button>
          )}
        </div>
      )}
    </aside>
  );

  return (
    <>
      <TeacherHeader />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold text-violet">
              <span className="size-2 rounded-full bg-violet" />
              {boardOnly ? "حصة على السبورة فقط · مجموعات" : `حصة مباشرة · ${mode === "groups" ? "مجموعات" : "فردي"}`}
            </p>
            <h1 className="mt-1 text-[28px] font-bold leading-tight text-indigo-deep sm:text-[32px]">
              {lesson.title} · {className}
            </h1>
          </div>
          <div role="tablist" aria-label="مراحل الحصة" className="flex gap-1.5">
            {phaseTabs.map((t) => {
              const on = t === activeTab;
              return (
                <button
                  key={t}
                  role="tab"
                  aria-selected={on}
                  disabled={ended}
                  onClick={() => goTab(t)}
                  className={`rounded-full border px-4 py-1.5 text-[11px] font-bold transition ${on ? "border-violet bg-violet text-white shadow-md shadow-violet/25" : "border-violet/10 bg-white text-indigo-deep/55 hover:text-indigo-deep"}`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid items-stretch gap-5 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col [&>section]:flex-1">{board}</div>
          {panel}
        </div>
      </main>
    </>
  );
}
