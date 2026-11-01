"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFlow } from "../FlowProvider";
import { TeacherHeader } from "../TeacherHeader";
import { CHALLENGE_LABELS, type Lesson } from "@/lib/lesson";
import {
  ANSWER_CARDS,
  CLASS_NAMES,
  GROUP_POOL,
  GUESTS,
  ROSTER,
  CLASS_SIZE,
  START_COUNT,
  addGuest,
  simulatedCorrect,
  splitStudents,
} from "@/lib/live";
import {
  ArenaBoard,
  BoardOnlyArena,
  BossBoard,
  ChallengeBoard,
  ExplainBoard,
  FinishBoard,
  LeaderPill,
  ScorePills,
} from "./boards";

type Slide =
  | { kind: "arena" }
  | { kind: "explain"; i: number }
  | { kind: "challenge"; i: number }
  | { kind: "reveal"; i: number }
  | { kind: "finish" };

const BOSS = 5; // station index used for the boss round

const POINTS = 10;

function AnsweredCounter({ total }: { total: number }) {
  // remounted (via key) for every challenge, so it always starts from zero
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((v) => (v < total ? v + 1 : v)), 650);
    return () => clearInterval(t);
  }, [total]);
  const pct = total ? Math.round((n / total) * 100) : 0;
  return (
    <div className="rounded-2xl bg-violet/[0.06] p-3.5">
      <div className="flex items-center justify-between text-xs font-bold text-indigo-deep">
        <span>أجابوا</span>
        <span>
          {n} من {total}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-violet/10">
        <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function LiveSessionDemo({ lesson, code }: { lesson: Lesson; code: string }) {
  const { share } = useFlow();
  const boardOnly = share.devices === "board";
  const mode: "groups" | "individual" = boardOnly ? "groups" : share.grouping;
  const groupCount = share.groupCount;
  const className = (CLASS_NAMES as Record<string, string>)[share.classId ?? "none"] ?? "صف تجريبي";

  const groups = GROUP_POOL.slice(0, groupCount);

  const [extra, setExtra] = useState<string[]>([]);
  // groups come from the class roster (26 students); a class-less session fills them as students arrive
  const [sizes, setSizes] = useState(() => splitStudents(!share.classId ? START_COUNT : CLASS_SIZE, groupCount));
  const [at, setAt] = useState(0);
  // board-only: which groups the teacher marked correct, per challenge slide
  const [entered, setEntered] = useState<Record<number, boolean[]>>({});

  const total = lesson.stations.length;

  const slides = useMemo<Slide[]>(() => {
    const s: Slide[] = [{ kind: "arena" }];
    for (let i = 0; i < total; i++) s.push({ kind: "explain", i }, { kind: "challenge", i }, { kind: "reveal", i });
    s.push({ kind: "challenge", i: BOSS }, { kind: "reveal", i: BOSS }, { kind: "finish" });
    return s;
  }, [total]);

  const slide = slides[at];
  const count = START_COUNT + extra.length;
  const names = [...ROSTER, ...extra].slice(0, 8);

  function simulateJoin() {
    const name = GUESTS[extra.length % GUESTS.length];
    setExtra((e) => [...e, name]);
    setSizes((s) => addGuest(s));
  }

  /* ---------- scoring ---------- */

  const correctAt = (g: number, idx: number) => (boardOnly ? Boolean(entered[idx - 1]?.[g]) : simulatedCorrect(g, idx));

  const groupScores = groups.map((_, g) =>
    slides.slice(0, at + 1).reduce((sum, s, idx) => {
      if (s.kind !== "reveal") return sum;
      return sum + (correctAt(g, idx) ? (s.i === BOSS ? POINTS * 2 : POINTS) : 0);
    }, 0),
  );

  const studentScores = ROSTER.map((name, k) => ({
    name,
    score: slides.slice(0, at + 1).reduce((sum, s, idx) => (s.kind === "reveal" && (k * 3 + idx) % 4 !== 0 ? sum + POINTS : sum), 0),
  })).sort((a, b) => b.score - a.score);

  const scoreRight =
    mode === "groups" ? (
      <ScorePills groups={groups} scores={groupScores} />
    ) : (
      <LeaderPill name={studentScores[0].name} score={studentScores[0].score} />
    );

  /* ---------- labels ---------- */

  const phaseTabs = boardOnly ? ["الساحة", "الشرح", "التحدي", "الكشف", "الختام"] : ["الساحة", "الشرح", "التحدي", "الختام"];
  const activeTab =
    slide.kind === "arena"
      ? "الساحة"
      : slide.kind === "explain"
        ? "الشرح"
        : slide.kind === "challenge"
          ? "التحدي"
          : slide.kind === "reveal"
            ? boardOnly
              ? "الكشف"
              : "التحدي"
            : "الختام";

  const goTab = (tab: string) => {
    const find = (k: Slide["kind"]) => {
      // jump to the first slide of that phase at or after the current station
      const station = "i" in slide ? slide.i : 0;
      const idx = slides.findIndex((s) => s.kind === k && (!("i" in s) || s.i >= station));
      return idx === -1 ? slides.findIndex((s) => s.kind === k) : idx;
    };
    if (tab === "الساحة") setAt(0);
    else if (tab === "الشرح") setAt(find("explain"));
    else if (tab === "التحدي") setAt(find("challenge"));
    else if (tab === "الكشف") setAt(find("reveal"));
    else setAt(slides.length - 1);
  };

  const modeLabel = boardOnly ? "حصة على السبورة فقط · مجموعات" : `حصة مباشرة · ${mode === "groups" ? "مجموعات" : "فردي"}`;

  const planIndex = slide.kind === "arena" ? 0 : slide.kind === "finish" ? total : "i" in slide ? slide.i : 0;
  const station = "i" in slide && slide.i < total ? lesson.stations[slide.i] : null;
  const isBoss = "i" in slide && slide.i === BOSS;

  const nextLabel =
    slide.kind === "arena"
      ? "ابدأ الحصة"
      : slide.kind === "explain"
        ? "اعرض التحدي"
        : slide.kind === "challenge"
          ? "اكشف الإجابة"
          : slide.kind === "reveal"
            ? slides[at + 1]?.kind === "finish"
              ? "اختم الحصة"
              : slides[at + 1]?.kind === "challenge"
                ? "تحدّي الزعيم"
                : "المحطة التالية"
            : "";

  /* ---------- board ---------- */

  let board: React.ReactNode;
  if (slide.kind === "arena") {
    board = boardOnly ? (
      <BoardOnlyArena lesson={lesson} groups={groups} sizes={sizes} />
    ) : (
      <ArenaBoard code={code} mode={mode} count={count} groups={groups} sizes={sizes} names={names} />
    );
  } else if (slide.kind === "explain" && station) {
    board = <ExplainBoard station={station} index={slide.i} total={total} right={scoreRight} />;
  } else if ((slide.kind === "challenge" || slide.kind === "reveal") && station) {
    board = (
      <ChallengeBoard
        challenge={station.challenge}
        label={`${slide.kind === "reveal" ? "الكشف" : "التحدي"} ${slide.i + 1} · ${CHALLENGE_LABELS[station.challenge.kind]}`}
        reveal={slide.kind === "reveal"}
        right={scoreRight}
      />
    );
  } else if ((slide.kind === "challenge" || slide.kind === "reveal") && isBoss) {
    board = <BossBoard items={lesson.boss} reveal={slide.kind === "reveal"} right={scoreRight} />;
  } else {
    const rows =
      mode === "groups"
        ? groups.map((g, i) => ({ name: g.name, score: groupScores[i], color: g.color })).sort((a, b) => b.score - a.score)
        : studentScores.slice(0, 5).map((s, i) => ({ ...s, color: GROUP_POOL[i % 4].color }));
    board = <FinishBoard rows={rows} mode={mode} />;
  }

  /* ---------- teacher panel ---------- */

  const arenaNote = boardOnly
    ? `الصف: ${className} · ${groupCount} مجموعات من «صفوفي». لا يحتاج الطلاب أجهزة ولا رمزًا.`
    : mode === "individual"
      ? "كل طالب يلعب لنفسه. لوحة الصدارة على السبورة تُظهر الخمسة الأوائل فقط، وكل طالب يرى ترتيبه على جهازه."
      : !share.classId
        ? "بلا صف: توزّع قفزة الطلاب على المجموعات بالتناوب عند دخولهم، ومن يدخل ضيفًا يُضاف إلى المجموعة الأقل عددًا."
        : "المجموعات جاهزة من «صفوفي»: متكافئة في العدد ومستوى الإتقان. ومن يدخل ضيفًا جديدًا يُضاف إلى المجموعة الأقل عددًا. تستطيع نقل أي طالب قبل البدء.";

  const panel = (
    <aside className="rounded-[28px] border border-violet/10 bg-white p-5 shadow-xl shadow-violet/5">
      <span className="inline-block rounded-full bg-indigo-deep px-3.5 py-1.5 text-[11px] font-bold text-white">
        لوحة المعلّم، لا تظهر على السبورة
      </span>
      <h2 className="mt-3 text-2xl font-bold text-indigo-deep">
        {slide.kind === "arena"
          ? "قبل أن تبدأ"
          : slide.kind === "finish"
            ? "انتهت الحصة"
            : isBoss
              ? "تحدّي الزعيم"
              : `المحطة ${planIndex + 1} من ${total}`}
      </h2>

      {slide.kind === "arena" && (
        <>
          <p className="mt-3 rounded-2xl bg-violet/[0.06] px-4 py-3 text-xs font-medium leading-6 text-indigo-deep/85">{arenaNote}</p>

          {boardOnly && (
            <div className="mt-3 rounded-2xl bg-violet/[0.06] p-4">
              <h3 className="text-sm font-bold text-indigo-deep">بطاقات الإجابة</h3>
              <p className="mt-1.5 text-[11px] font-medium leading-6 text-indigo-deep/65">
                طقم لكل مجموعة: أ ب ج د، وصح وخطأ. ترفع المجموعة بطاقتها بعد التشاور.
              </p>
              <div className="mt-3 flex flex-wrap gap-2" dir="rtl">
                {ANSWER_CARDS.map((c) => (
                  <span
                    key={c.label}
                    className="grid h-10 min-w-10 place-items-center rounded-xl px-2.5 text-sm font-bold text-white shadow-sm"
                    style={{ background: c.color }}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
              <button
                onClick={() => window.print()}
                className="mt-3 w-full rounded-xl border border-violet/10 bg-white py-2.5 text-xs font-bold text-violet transition hover:border-violet/30"
              >
                اطبع بطاقات الإجابة
              </button>
              <p className="mt-2.5 text-[11px] font-medium leading-6 text-indigo-deep/60">
                لا طابعة؟ يكفي أن تكتب المجموعة الحرف على ورقة، أو أن ترفع أصابعها: 1 إلى 4.
              </p>
            </div>
          )}
        </>
      )}

      {slide.kind !== "arena" && slide.kind !== "finish" && (
        <div className="mt-3 space-y-3">
          {(slide.kind === "challenge" || slide.kind === "reveal") && !boardOnly && slide.kind === "challenge" && (
            <AnsweredCounter key={at} total={count} />
          )}

          {boardOnly && slide.kind === "challenge" && (
            <div className="rounded-2xl bg-violet/[0.06] p-4">
              <h3 className="text-sm font-bold text-indigo-deep">أدخل إجابات المجموعات</h3>
              <p className="mt-1 text-[11px] text-indigo-deep/60">حدّد المجموعات التي أجابت صحيحًا: +{POINTS} نقاط لكل منها.</p>
              <ul className="mt-3 space-y-2">
                {groups.map((g, i) => {
                  const on = Boolean(entered[at]?.[i]);
                  return (
                    <li key={g.id}>
                      <button
                        aria-pressed={on}
                        onClick={() =>
                          setEntered((e) => {
                            const row = [...(e[at] ?? groups.map(() => false))];
                            row[i] = !row[i];
                            return { ...e, [at]: row };
                          })
                        }
                        className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${
                          on ? "border-mint bg-mint/10 text-emerald-700" : "border-violet/10 bg-white text-indigo-deep"
                        }`}
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

          {slide.kind === "reveal" && (
            <div className="rounded-2xl bg-mint/10 p-4">
              <h3 className="text-sm font-bold text-emerald-800">نتيجة هذا التحدي</h3>
              <ul className="mt-2 space-y-1.5 text-xs font-semibold text-emerald-900">
                {mode === "groups" ? (
                  groups.map((g, i) => (
                    <li key={g.id} className="flex items-center justify-between">
                      <span>{g.name}</span>
                      <span>{correctAt(i, at) ? `+${isBoss ? POINTS * 2 : POINTS}` : "0"}</span>
                    </li>
                  ))
                ) : (
                  <li>{studentScores.filter((s) => s.score > 0).length} من {ROSTER.length} طلاب أجابوا صحيحًا.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {slide.kind === "finish" && (
        <p className="mt-3 rounded-2xl bg-violet/[0.06] px-4 py-3 text-xs font-medium leading-6 text-indigo-deep/85">
          انتهى الدرس. نتائج الصف وفجوات الفهم جاهزة في صفحة النتائج.
        </p>
      )}

      <h3 className="mt-5 text-xs font-bold text-indigo-deep">خطة الحصة</h3>
      <ol className="mt-2 space-y-1">
        {lesson.stations.map((s, i) => {
          const on = slide.kind !== "arena" && slide.kind !== "finish" && planIndex === i;
          return (
            <li key={s.id}>
              <button
                onClick={() => setAt(slides.findIndex((x) => x.kind === "explain" && x.i === i))}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-xs font-bold transition ${
                  on || (slide.kind === "arena" && i === 0) ? "bg-violet/10 text-violet" : "text-indigo-deep/55 hover:bg-violet/5"
                }`}
              >
                <span
                  className={`grid size-5 place-items-center rounded-full text-[10px] ${
                    on || (slide.kind === "arena" && i === 0) ? "bg-violet text-white" : "bg-violet/10 text-indigo-deep/55"
                  }`}
                >
                  {i + 1}
                </span>
                {s.title}
              </button>
            </li>
          );
        })}
        <li>
          <button
            onClick={() => setAt(slides.findIndex((x) => x.kind === "challenge" && x.i === BOSS))}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-xs font-bold transition ${
              isBoss ? "bg-pink-card/10 text-pink-card" : "text-indigo-deep/55 hover:bg-violet/5"
            }`}
          >
            <span className="grid size-5 place-items-center rounded-full bg-violet/10 text-[10px]">★</span>
            تحدّي الزعيم
          </button>
        </li>
      </ol>

      {slide.kind === "arena" && !boardOnly && (
        <button
          onClick={simulateJoin}
          className="mt-4 w-full rounded-2xl border border-dashed border-violet/30 py-3 text-xs font-bold text-violet transition hover:bg-violet/5"
        >
          محاكاة: دخل طالب
        </button>
      )}

      <div className="mt-4 flex gap-2.5">
        {slide.kind === "finish" ? (
          <Link
            href="/results"
            className="block w-full rounded-full bg-brand py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-violet/30"
          >
            عرض النتائج
          </Link>
        ) : (
          <>
            <button
              onClick={() => setAt((a) => Math.min(slides.length - 1, a + 1))}
              className="flex-1 rounded-full bg-brand py-3.5 text-sm font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110"
            >
              {nextLabel}
            </button>
            {slide.kind !== "arena" && (
              <button
                onClick={() => setAt((a) => Math.max(0, a - 1))}
                className="rounded-full border border-violet/15 bg-white px-5 text-xs font-bold text-violet"
              >
                السابق
              </button>
            )}
          </>
        )}
      </div>
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
              {modeLabel}
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
                  onClick={() => goTab(t)}
                  className={`rounded-full border px-4 py-1.5 text-[11px] font-bold transition ${
                    on ? "border-violet bg-violet text-white shadow-md shadow-violet/25" : "border-violet/10 bg-white text-indigo-deep/55 hover:text-indigo-deep"
                  }`}
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
