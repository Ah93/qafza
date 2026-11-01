"use client";

import { useReducer, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/teacher/Toast";
import { CHALLENGE_LABELS, modeLabel } from "@/lib/lesson";
import { ENGAGE_CAP, GROUP_BASE, POINTS, nextRank, rankOf, RANKS } from "@/lib/play";
import { GROUP_POOL } from "@/lib/live";
import { Flame, Hearts, NamePill, PlayHeader } from "../StudentHeader";
import { Overlay } from "../Overlay";
import { useStudent } from "../StudentProvider";
import { usePlayLesson } from "../usePlayLesson";
import { ChallengeView } from "./ChallengeView";
import { parseContent } from "./StationView";
import { initialRun, reducer } from "./run";

/** the rest of the class: the lesson leaderboard (the student starts 6th) */
const OTHERS = [
  { name: "عبدالله", score: 170 },
  { name: "سارة", score: 150 },
  { name: "نورة", score: 140 },
  { name: "عمر", score: 130 },
  { name: "خالد", score: 125 },
];
const CLASS_TOTAL = 26;
/** group totals so far in this lesson: الصقور (yours), اللؤلؤ, النخيل */
const LIVE_GROUP_SCORES = [520, 470, 440];
const SHOWN_ON_BOARD = 5;
const START_LIFETIME = 60; // points from earlier lessons
const START_LESSON = 45; // points earned so far in this lesson: 105 in all, rank "باحث"

export function LiveStudentDemo() {
  const lesson = usePlayLesson("joined");
  const { name, joined } = useStudent();
  const toast = useToast();

  const [run, dispatch] = useReducer(reducer, null, () => ({ ...initialRun(START_LIFETIME), points: START_LESSON, streak: 2 }));
  const [at, setAt] = useState(2); // the teacher's station (0-based): the design starts at station 3
  const [item, setItem] = useState(2); // the design starts on the third point: الشرايين
  const [asking, setAsking] = useState(false);
  const [resolved, setResolved] = useState<Record<number, boolean>>({});
  const [engaged, setEngaged] = useState<Record<number, number>>({});

  const total = lesson.stations.length;
  const station = lesson.stations[at];
  const { items } = parseContent(station.content);
  const current = items[Math.min(item, items.length - 1)];
  const points = run.startPoints + run.points;
  const rank = rankOf(points);
  const nowEngaged = engaged[at] ?? 0;

  const groupMode = (joined?.share.grouping ?? "groups") === "groups";
  const groups = GROUP_BASE.map((g, i) => ({ ...g, color: GROUP_POOL[i].color, score: LIVE_GROUP_SCORES[i] + (g.mine ? run.points - START_LESSON : 0) })).sort((a, b) => b.score - a.score);

  const all = [...OTHERS, { name, score: run.points + 60 }].sort((a, b) => b.score - a.score);
  const myRank = all.findIndex((p) => p.name === name) + 1;
  const fifth = all[SHOWN_ON_BOARD - 1];
  const gap = myRank > SHOWN_ON_BOARD ? fifth.score - (run.points + 60) : 0;

  function teacherNext() {
    setAsking(false);
    if (item < items.length - 1) return setItem(item + 1);
    if (at < total - 1) {
      setAt(at + 1);
      setItem(0);
    } else toast.show("وصل المعلّم إلى آخر المحطات");
  }

  function understood() {
    if (nowEngaged >= ENGAGE_CAP) return toast.show(`أخذت نقاط المتابعة كلها في هذه المحطة (${ENGAGE_CAP}).`);
    dispatch({ type: "engage" });
    setEngaged((e) => ({ ...e, [at]: (e[at] ?? 0) + POINTS.engage }));
    toast.show(`المعلّم يرى أنك فهمت. +${POINTS.engage} نقاط متابعة`);
  }

  return (
    <>
      <PlayHeader>
        <span className="hidden rounded-full bg-violet/10 px-4 py-2 text-[11px] font-bold text-violet sm:block">
          {groupMode ? "في الحصة: المعلّم يقود الدرس" : "في الحصة: فردي · المعلّم يقود"}
        </span>
        <NamePill group={groupMode ? { name: "الصقور", color: "#ec4899" } : null} />
      </PlayHeader>

      <main className="mx-auto grid w-full max-w-[1000px] flex-1 items-start gap-4 px-5 py-5 lg:grid-cols-[1fr_245px]">
        <div>
          <section className="dots relative overflow-hidden rounded-[28px] bg-gradient-to-b from-[#241356] to-[#4a1d96] p-6 text-white shadow-2xl shadow-indigo-deep/25" aria-live="polite">
            <div className="relative flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold text-white/75">
                المحطة {at + 1} من {total} · {modeLabel(station.mode)}
              </p>
              <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold">تتبع السبورة</span>
            </div>
            <h1 className="relative mt-2 text-[40px] font-bold leading-tight">{station.title}</h1>

            {!asking ? (
              <>
                <ol className="relative mt-4 flex items-start justify-between">
                  <span aria-hidden className="absolute inset-x-5 top-[15px] border-t border-dotted border-white/30" />
                  {items.map((it, i) => (
                    <li key={i} className="relative z-10 flex flex-1 flex-col items-center gap-1.5" aria-current={i === item ? "step" : undefined}>
                      <span className={`grid size-8 place-items-center rounded-full text-xs font-bold ${i === item ? "bg-sun text-indigo-deep ring-4 ring-sun/30" : "bg-white/15"}`}>{i + 1}</span>
                      <span className="text-[11px] font-semibold text-white/80">{it.head || `${i + 1}`}</span>
                    </li>
                  ))}
                </ol>
                <div key={`${at}-${item}`} className="relative mt-4 animate-[pop_.3s_ease-out] rounded-2xl bg-white px-5 py-3.5 text-indigo-deep">
                  <p className="text-lg font-bold">{current?.head || station.title}</p>
                  <p className="mt-0.5 text-sm font-medium text-indigo-deep/70">{current?.body}</p>
                </div>
                <p className="relative mt-3.5 text-xs font-semibold text-white/85">المعلّم يشرح «{current?.head || station.title}». شاشتك تتبعه.</p>
              </>
            ) : (
              <div className="relative mt-4 rounded-2xl bg-white p-5 text-indigo-deep">
                <p className="mb-3 text-[11px] font-bold text-violet">التحدي {at + 1} · {CHALLENGE_LABELS[station.challenge.kind]}</p>
                <ChallengeView
                  key={at}
                  challenge={station.challenge}
                  onAttempt={(attempt, correct) => {
                    dispatch({ type: "answer", challenge: at, attempt, correct });
                    if (correct || attempt === 2) setResolved((r) => ({ ...r, [at]: true }));
                  }}
                />
                {resolved[at] && <p className="mt-3 text-[11px] font-semibold text-indigo-deep/60">أجبت. انتظر المعلّم ليكشف النتيجة ويتابع.</p>}
              </div>
            )}
          </section>

          {!asking && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button onClick={understood} className="rounded-2xl border border-violet/10 bg-white py-3.5 text-sm font-bold text-indigo-deep shadow-sm transition hover:border-violet/40">
                فهمت
              </button>
              <button onClick={() => toast.show("أُرسل طلبك: سيعيد المعلّم الشرح")} className="rounded-2xl border border-violet/10 bg-white py-3.5 text-sm font-bold text-indigo-deep shadow-sm transition hover:border-violet/40">
                أعد الشرح
              </button>
            </div>
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[11px] font-bold text-violet">
            <button className="underline underline-offset-4" onClick={teacherNext}>
              محاكاة: حرّر المعلّم الشاشات
            </button>
            <button className="underline underline-offset-4" onClick={() => setAsking((a) => !a)}>
              {asking ? "محاكاة: عاد المعلّم إلى الشرح" : "محاكاة: المعلّم طرح التحدي"}
            </button>
          </div>
        </div>

        <aside className="space-y-3">
          <section className="rounded-3xl border border-violet/10 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <Flame n={run.streak} />
              <Hearts n={run.hearts} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-indigo-deep">نقاط المعرفة</h2>
              <span className="text-base font-bold text-violet">{points}</span>
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-indigo-deep/55">
              منها نقاط متابعة: {nowEngaged} من {ENGAGE_CAP} في هذه المحطة
            </p>
            <span className="mt-3 inline-block rounded-full bg-sun px-3.5 py-1.5 text-[11px] font-bold text-indigo-deep">الرتبة: {rank.name}</span>
          </section>

          <section className="dots relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#241356] to-[#4a1d96] p-4 text-white shadow-xl shadow-indigo-deep/25">
            {groupMode ? (
              <>
                <h2 className="relative text-lg font-bold">المجموعات</h2>
                <ol className="relative mt-3 space-y-1.5">
                  {groups.map((g) => (
                    <li key={g.name} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold ${g.mine ? "bg-white/20 ring-1 ring-white/40" : "bg-white/10"}`}>
                      <span className="size-2.5 rounded-[3px]" style={{ background: g.color }} />
                      <span className="flex-1">{g.name}{g.mine ? "، مجموعتك" : ""}</span>
                      <span>{g.score}</span>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <>
                <h2 className="relative text-lg font-bold">ترتيبك</h2>
                <p className="relative mt-1 flex items-baseline gap-2">
                  <span className="text-[44px] font-bold leading-none">{myRank}</span>
                  <span className="text-xs font-semibold text-white/75">من {CLASS_TOTAL}</span>
                </p>
                <p className="relative mt-2 border-b border-white/15 pb-3 text-[11px] font-medium leading-5 text-white/80">
                  {myRank > SHOWN_ON_BOARD ? `على ${gap} نقطة من الخامس، وهو آخر من يظهر على السبورة.` : "أنت بين الخمسة الأوائل الذين تعرضهم السبورة."}
                </p>
                <ol className="relative mt-3 space-y-1.5">
                  {all.slice(0, 3).map((p, i) => (
                    <li key={p.name} className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">
                      <span>{i + 1}. {p.name}</span>
                      <span>{p.score}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>

          <Link href="/learn" className="block rounded-2xl border border-violet/10 bg-white py-3 text-center text-[11px] font-bold text-violet transition hover:border-violet/40">
            غادر الحصة
          </Link>
        </aside>
      </main>

      {run.rankUp !== null && (
        <Overlay label="ترقية الرتبة">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-sun text-4xl shadow-lg">🏆</span>
          <h2 className="mt-4 text-2xl font-bold text-indigo-deep">ترقّيت إلى «{RANKS[run.rankUp].name}»!</h2>
          <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/65">
            {nextRank(points) ? `الرتبة التالية «${nextRank(points)!.name}» تبدأ من ${nextRank(points)!.from} نقطة، وبقي لك ${nextRank(points)!.from - points}.` : "بلغت أعلى رتبة. أحسنت!"}
          </p>
          <button autoFocus onClick={() => dispatch({ type: "rankSeen" })} className="mt-5 rounded-full bg-brand px-9 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30">
            أكمل
          </button>
        </Overlay>
      )}
      {toast.node}
    </>
  );
}
