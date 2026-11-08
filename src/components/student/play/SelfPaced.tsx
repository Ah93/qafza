"use client";

import * as plural from "@/lib/plural";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Gift, Layers, Network, Trophy, WifiOff } from "lucide-react";
import { api, postJson } from "@/lib/client-api";
import { CHALLENGE_LABELS, modeLabel } from "@/lib/lesson";
import { CARDS, CARDS_HELP, cardName, GROUP_BASE, PEERS, PLAYER, POINTS, nextRank, rankOf, RANKS } from "@/lib/play";
import { useStudent } from "../StudentProvider";
import { usePlayLesson, type PlayVariant } from "../usePlayLesson";
import { Flame, Hearts, NamePill, PlayHeader } from "../StudentHeader";
import { Overlay } from "../Overlay";
import { sfx } from "@/lib/sound";
import { SourceChip } from "@/components/teacher/review/parts";
import { BossView, ChallengeView } from "./ChallengeView";
import { StationView } from "./StationView";
import { accuracy, buildSequence, finalBadges, initialRun, reducer, type Run } from "./run";
import { dateFormat } from "@/lib/format";

const weekday = dateFormat({ weekday: "long" });

type Board = { top: { name: string; points: number }[]; scores: number[] };
type OpenAttempt = { id: string; results: (0 | 1 | null)[]; points: number; reached: number; minutes: number };

export function SelfPaced({ variant = "joined" }: { variant?: PlayVariant }) {
  const router = useRouter();
  const lesson = usePlayLesson(variant);
  const { setResult, joined, deviceRef, name, progress, refreshProgress } = useStudent();
  const total = lesson.stations.length;
  const seq = useMemo(() => buildSequence(total), [total]);

  // only a lesson entered with a real code is saved; the demo and the teacher's preview are not
  const real = variant === "joined" && !!joined;
  const needsJoin = variant === "joined" && !joined;

  // the first station is already on screen, so its display mode counts
  const [run, dispatch] = useReducer(reducer, null, () => ({ ...initialRun(progress?.points ?? 0), modes: [lesson.stations[0].mode] }));
  const [resolved, setResolved] = useState<Record<number, boolean>>({});
  const [opened, setOpened] = useState(false);
  const [maxAt, setMaxAt] = useState(0);
  const [offline, setOffline] = useState(false);
  const [sheet, setSheet] = useState(false);
  /** what the student picked on the first try of each challenge, kept so the teacher can see which wrong answer tempted the class */
  const choices = useRef<Record<number, number>>({});
  const [welcome, setWelcome] = useState(false);
  const [board, setBoard] = useState<"people" | "groups">("people");
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<{ message: string; needsLogin: boolean } | null>(null);
  const [live, setLive] = useState<Board | null>(null);

  const attemptId = useRef<string | undefined>(undefined);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(false);
  const latest = useRef({ run, at: 0, seconds: 0 });

  // a new rank gets its fanfare
  const rankUp = run.rankUp;
  useEffect(() => {
    if (rankUp !== null) sfx.rankUp();
  }, [rankUp]);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    latest.current = { run, at: run.at, seconds };
  });

  // opened without a code (a refresh, a bookmark): the code screen is the way in
  useEffect(() => {
    if (needsJoin) router.replace("/join");
  }, [needsJoin, router]);

  const stationReached = useCallback((at: number) => {
    const p = seq[at];
    return p.kind === "station" || p.kind === "challenge" ? p.i : p.kind === "surprise" ? 3 : total;
  }, [seq, total]);

  /** save this student's progress. Saves are queued so two never race and create two attempts. */
  const save = useCallback(
    (r: Run, at: number, finished: boolean, secs: number): Promise<boolean> => {
      if (!real || !joined) return Promise.resolve(true);
      const job = queue.current.then(async () => {
        const res = await postJson<{ id: string }>("/api/attempts", {
          id: attemptId.current,
          code: joined.code,
          name,
          ref: deviceRef,
          mode: "self",
          results: lesson.stations.map((_, i) => (r.firstTry[i] === true ? 1 : r.firstTry[i] === false ? 0 : null)),
          choices: lesson.stations.map((_, i) => choices.current[i] ?? null),
          boss: finished ? lesson.boss.map(() => (r.bossBeaten ? 1 : 0)) : [],
          points: r.points,
          reached: stationReached(at),
          minutes: secs / 60,
          finished,
          badges: finished ? finalBadges(r) : [],
          cards: r.cards,
        });
        if (res.ok) {
          attemptId.current = res.data.id;
          pending.current = false;
          setSaveError(null);
          return true;
        }
        // no connection: keep what we have and send it when the network is back
        if (res.status === 0) {
          pending.current = true;
          setOffline(true);
          return false;
        }
        setSaveError({ message: res.error, needsLogin: res.status === 403 });
        return false;
      });
      queue.current = job.catch(() => undefined);
      return job;
    },
    [real, joined, name, deviceRef, lesson, stationReached],
  );

  // start: pick up an unfinished attempt of this device, or open a new one
  const booted = useRef(false);
  useEffect(() => {
    if (!real || !joined || !deviceRef || !name || booted.current) return;
    booted.current = true;
    let current = true;
    api<{ attempt: OpenAttempt | null }>(`/api/attempts?code=${joined.code}&ref=${encodeURIComponent(deviceRef)}`).then((r) => {
      if (!current) return;
      const a = r.ok ? r.data.attempt : null;
      if (!a) return void save(latest.current.run, 0, false, 0);
      attemptId.current = a.id;
      const at = a.reached < total ? seq.findIndex((x) => x.kind === "station" && x.i === a.reached) : seq.findIndex((x) => x.kind === "boss");
      dispatch({ type: "restore", at, points: a.points, results: a.results });
      setMaxAt(at);
      setResolved(Object.fromEntries(a.results.flatMap((v, i) => (v !== null ? [[i, true]] : []))));
      setSeconds(Math.round(a.minutes * 60));
      setWelcome(true);
    });
    return () => {
      current = false;
    };
  }, [real, joined, deviceRef, name, total, seq, save]);

  // the network comes and goes: say so, and send what was waiting
  useEffect(() => {
    if (!real) return;
    const down = () => setOffline(true);
    const up = () => {
      setOffline(false);
      if (pending.current) void save(latest.current.run, latest.current.at, false, latest.current.seconds);
    };
    window.addEventListener("offline", down);
    window.addEventListener("online", up);
    return () => {
      window.removeEventListener("offline", down);
      window.removeEventListener("online", up);
    };
  }, [real, save]);

  // the class leaderboard of a real lesson
  useEffect(() => {
    if (!real || !joined) return;
    let current = true;
    api<Board>(`/api/board/${joined.code}`).then((r) => current && r.ok && setLive(r.data));
    return () => {
      current = false;
    };
  }, [real, joined]);

  const phase = seq[run.at];
  const points = run.startPoints + run.points;
  const rank = rankOf(points);

  /** the student chose to begin again: a fresh attempt (the unfinished one is left behind and never counts) */
  function startOver() {
    choices.current = {};
    attemptId.current = undefined;
    dispatch({ type: "reset" });
    setResolved({});
    setMaxAt(0);
    setSeconds(0);
    setWelcome(false);
    void save(initialRun(0), 0, false, 0);
  }

  function goTo(at: number) {
    const target = seq[at];
    if (target?.kind === "station") dispatch({ type: "mode", mode: lesson.stations[target.i].mode });
    dispatch({ type: "go", to: at });
    setMaxAt((m) => Math.max(m, at));
    window.scrollTo({ top: 0, behavior: "smooth" });
    void save(run, at, false, seconds);
  }

  async function finish(skipSave = false) {
    setSaving(true);
    if (!skipSave && !(await save(run, run.at, true, seconds))) {
      setSaving(false);
      return;
    }
    setResult({
      points: run.points,
      right: run.right,
      total: run.right + run.wrong,
      accuracy: accuracy(run),
      minutes: Math.max(1, Math.ceil(seconds / 60)),
      modes: run.modes.length,
      badges: finalBadges(run),
      cards: run.cards,
      bestStreak: run.bestStreak,
      hearts: run.hearts,
      bossBeaten: run.bossBeaten,
      missed: lesson.stations.map((_, i) => i).filter((i) => run.firstTry[i] === false),
      startPoints: run.startPoints,
      lesson,
    });
    void refreshProgress();
    router.push("/play/result");
  }

  const canNext =
    !offline &&
    !saving &&
    !run.recovering &&
    (phase.kind === "station" ||
      (phase.kind === "challenge" && resolved[phase.i]) ||
      (phase.kind === "surprise" && opened) ||
      (phase.kind === "boss" && run.bossBeaten));

  const isLast = seq[run.at + 1]?.kind === "done";

  /* ---------- segments: 5 stations + 5 challenges + boss ---------- */
  const segments = seq.map((p, idx) => ({ p, idx })).filter(({ p }) => p.kind !== "surprise" && p.kind !== "done");

  /* ---------- leaderboards ---------- */
  // the made-up classmates (سارة، عمر…) belong to the built-in sample lesson only. A teacher previewing their own lesson
  // sees an empty board that says so, and a real lesson shows the real players.
  const sampleOnly = variant === "demo";
  const myName = name || (sampleOnly ? PLAYER.name : "أنت");
  const people = real
    ? [...(live?.top.map((t) => ({ name: t.name, initial: t.name[0], color: "#7c3aed", score: t.points, me: false })) ?? []), { name: `${myName} (أنت)`, initial: myName[0], color: PLAYER.color, score: run.points, me: true }]
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
    : [
        ...(sampleOnly ? PEERS.map((p) => ({ name: p.name, initial: p.initial, color: p.color, score: p.base, me: false })) : []),
        { name: `${sampleOnly ? PLAYER.name : myName} (أنت)`, initial: sampleOnly ? PLAYER.initial : myName[0], color: PLAYER.color, score: run.points, me: true },
      ].sort((a, b) => b.score - a.score);
  const myRank = real ? 1 + (live?.scores.filter((s) => s > run.points).length ?? 0) : null;
  const groups = (sampleOnly ? GROUP_BASE : []).map((g) => ({ ...g, score: g.base + (g.mine ? run.points : 0) })).sort((a, b) => b.score - a.score);

  const challengeNo = phase.kind === "challenge" ? phase.i : phase.kind === "station" ? phase.i : 0;
  const station = phase.kind === "station" || phase.kind === "challenge" ? lesson.stations[phase.i] : null;
  const previous = phase.kind === "challenge" && phase.i > 0 ? lesson.stations[phase.i - 1] : station;
  const dueAt = real ? joined?.share.dueAt ?? null : null;
  const dueLabel = real ? (dueAt ? `تعلّم ذاتي حتى ${weekday.format(dueAt)}` : "تعلّم ذاتي") : "تعلّم ذاتي حتى الخميس";

  if (needsJoin) return null;

  /* the side column: the map of stations, then the leaderboard and the cards. On a phone the map is the strip at the top
     and the other two open from the bottom button, so the station and the challenge get the whole width. */
  const mapSection = (
    <>
            <section className="rounded-3xl border border-violet/10 bg-white p-4 shadow-sm">
              <h2 className="flex items-center justify-between text-base font-bold text-indigo-deep">
                خريطة المحطات
                <Network className="size-3.5 text-violet" />
              </h2>
              <ol className="mt-2.5 space-y-1">
                {lesson.stations.map((s, i) => {
                  const here = (phase.kind === "station" || phase.kind === "challenge") && phase.i === i;
                  const reached = seq.findIndex((x) => x.kind === "station" && x.i === i) <= maxAt;
                  const done = seq.findIndex((x) => x.kind === "challenge" && x.i === i) < run.at;
                  return (
                    <li key={s.id}>
                      <button
                        disabled={!reached}
                        onClick={() => goTo(seq.findIndex((x) => x.kind === "station" && x.i === i))}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-xs font-bold transition ${here ? "bg-violet/10 text-violet" : reached ? "text-indigo-deep hover:bg-violet/5" : "text-indigo-deep/35"}`}
                      >
                        <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] ${here ? "bg-violet text-white" : done ? "bg-mint text-white" : "bg-violet/10"}`}>
                          {done ? <Check className="size-3" strokeWidth={3.5} /> : i + 1}
                        </span>
                        <span className="truncate">{s.title}</span>
                      </button>
                    </li>
                  );
                })}
                <li>
                  <span className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-bold ${phase.kind === "boss" ? "bg-pink-card/10 text-pink-card" : "text-indigo-deep/35"}`}>
                    <span className="grid size-6 place-items-center rounded-full bg-pink-card/10 text-[10px] text-pink-card">★</span>
                    الزعيم
                  </span>
                </li>
              </ol>
            </section>

    </>
  );
  const restSection = (
    <>

            <section className="dots relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#241356] to-[#4a1d96] p-4 text-white shadow-xl shadow-indigo-deep/25">
              <div className="relative flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 whitespace-nowrap text-[15px] font-bold">
                  لوحة الصدارة
                  <Trophy className="size-3.5 text-sun" />
                </h2>
                {sampleOnly && (
                  <div className="flex rounded-full bg-white/10 p-0.5 text-[9px] font-bold">
                    {([
                      ["people", "الأفراد"],
                      ["groups", "المجموعات"],
                    ] as const).map(([id, label]) => (
                      <button key={id} onClick={() => setBoard(id)} aria-pressed={board === id} className={`rounded-full px-2 py-1 transition ${board === id ? "bg-white text-indigo-deep" : "text-white/70"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <ol className="relative mt-3 space-y-1.5">
                {board === "people" || !sampleOnly
                  ? people.map((p, i) => (
                      <li key={`${p.name}-${i}`} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold ${p.me ? "bg-white/20 ring-1 ring-white/40" : "bg-white/10"}`}>
                        <span className="w-3 text-[10px] text-white/60">{i + 1}</span>
                        <span className="grid size-5 place-items-center rounded-full text-[10px]" style={{ background: p.color }}>
                          {p.initial}
                        </span>
                        <span className="flex-1 truncate">{p.name}</span>
                        <span>{p.score}</span>
                      </li>
                    ))
                  : groups.map((g, i) => (
                      <li key={g.name} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold ${g.mine ? "bg-white/20 ring-1 ring-white/40" : "bg-white/10"}`}>
                        <span className="w-3 text-[10px] text-white/60">{i + 1}</span>
                        <span className="size-2.5 rounded-[3px]" style={{ background: g.color }} />
                        <span className="flex-1">
                          {g.name}
                          {g.mine ? "، مجموعتك" : ""}
                        </span>
                        <span>{g.score}</span>
                      </li>
                    ))}
              </ol>
              {!real && !sampleOnly && <p className="relative mt-2.5 text-[10px] font-medium leading-5 text-white/75">هنا تظهر أسماء طلابك حين يلعبون الدرس. هذه معاينة، فلا أحد غيرك فيها.</p>}
              {real && myRank !== null && live && <p className="relative mt-2.5 text-[10px] font-medium text-white/70">ترتيبك الآن: {myRank} من {live.scores.length + 1}</p>}
            </section>

            <section className="rounded-3xl border border-violet/10 bg-white p-4 shadow-sm">
              <h2 className="flex items-center justify-between text-base font-bold text-indigo-deep">
                بطاقاتك
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-deep/50">
                  {run.cards.length} من {CARDS.length}
                  <Layers className="size-3.5 text-pink-card" />
                </span>
              </h2>
              <ul className="mt-3 grid grid-cols-3 gap-2">
                {CARDS.map((c, i) => {
                  const has = run.cards.includes(i);
                  return (
                    <li
                      key={c.name}
                      title={has ? cardName(i, lesson.stations.map((s) => s.title)) : "لم تُكتشف"}
                      className={`grid aspect-[4/3] place-items-center rounded-xl px-1 text-center text-[9px] font-bold leading-4 ${has ? (c.rare ? "bg-gradient-to-br from-amber-400 to-pink-500 text-white" : "bg-gradient-to-br from-violet to-orchid text-white") : "border border-dashed border-violet/25 bg-violet/[0.04] text-indigo-deep/30"}`}
                    >
                      {has ? cardName(i, lesson.stations.map((s) => s.title)) : "؟"}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[11px] font-medium leading-5 text-indigo-deep/55">{CARDS_HELP}</p>
            </section>

    </>
  );

  return (
    <>
      <PlayHeader title={lesson.title}>
        <span className="hidden rounded-full bg-pink-50 px-4 py-2 text-[11px] font-bold text-pink-600 sm:block">{dueLabel}</span>
        <NamePill />
      </PlayHeader>

      {offline && (
        <div role="alert" className="sticky top-16 z-20 border-b border-rose-200 bg-rose-50">
          <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-5 py-2.5 text-xs font-bold text-rose-800">
            <span className="flex items-center gap-2">
              <WifiOff className="size-4" />
              انقطع الاتصال. {real ? "نحفظ تقدّمك حين يعود." : "تقدّمك محفوظ، وتُكمل حين يعود."}
            </span>
            {!real && (
              <button onClick={() => setOffline(false)} className="rounded-full bg-rose-600 px-4 py-1.5 text-white">
                عاد الاتصال
              </button>
            )}
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 py-5 max-md:pb-24">
        {/* stats */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-3xl border border-violet/10 bg-white px-5 py-3 shadow-sm">
          <Hearts n={run.hearts} />
          <Flame n={run.streak} />
          <span className="text-[11px] font-semibold text-indigo-deep/55">الشعلة</span>
          <span className="rounded-full bg-mint px-3.5 py-1.5 text-[11px] font-bold text-white">{plural.knowledgePoints(run.points)}</span>
          <span className="rounded-full bg-sun px-3.5 py-1.5 text-[11px] font-bold text-indigo-deep">الرتبة: {rank.name}</span>
        </div>

        {/* progress */}
        <div className="mt-3 flex gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={segments.length} aria-valuenow={segments.filter(({ idx }) => idx < run.at).length}>
          {segments.map(({ p, idx }) => {
            const current = idx === run.at;
            const done = idx < run.at;
            return <span key={idx} className={`h-1.5 flex-1 rounded-full transition ${current ? "bg-brand" : done ? "bg-violet" : p.kind === "station" ? "bg-slate-200" : "bg-pink-200"}`} />;
          })}
        </div>

        {/* phone: one dot per station (tap one you have reached to go back to it) */}
        <ol className="mt-3 flex items-center justify-between gap-1.5 md:hidden" aria-label="المحطات">
          {lesson.stations.map((st, i) => {
            const here = (phase.kind === "station" || phase.kind === "challenge") && phase.i === i;
            const reached = seq.findIndex((x) => x.kind === "station" && x.i === i) <= maxAt;
            const done = seq.findIndex((x) => x.kind === "challenge" && x.i === i) < run.at;
            return (
              <li key={st.id} className="flex-1">
                <button
                  disabled={!reached}
                  onClick={() => goTo(seq.findIndex((x) => x.kind === "station" && x.i === i))}
                  aria-label={`المحطة ${i + 1}: ${st.title}${here ? " (الحالية)" : done ? " (أنهيتها)" : ""}`}
                  aria-current={here ? "step" : undefined}
                  className={`mx-auto grid size-11 place-items-center rounded-full text-sm font-bold transition ${here ? "bg-violet text-white ring-4 ring-violet/20" : done ? "bg-mint text-white" : reached ? "bg-violet/10 text-violet" : "bg-slate-100 text-slate-400"}`}
                >
                  {done ? <Check className="size-4" strokeWidth={3.5} /> : i + 1}
                </button>
              </li>
            );
          })}
          <li className="flex-1">
            <span aria-label="الزعيم" className={`mx-auto grid size-11 place-items-center rounded-full text-sm ${phase.kind === "boss" ? "bg-pink-card text-white ring-4 ring-pink-card/20" : "bg-pink-card/10 text-pink-card"}`}>★</span>
          </li>
        </ol>

        <div className="mt-4 grid items-start gap-4 md:grid-cols-[1fr_230px]">
          <div className="min-w-0">
            <section className="rounded-3xl border border-violet/10 bg-white p-5 shadow-sm sm:p-6" aria-live="polite">
              {station && phase.kind === "station" && (
                <>
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold text-violet">
                        المحطة {phase.i + 1} من {total}
                      </p>
                      <h1 className="mt-0.5 text-[30px] font-bold leading-tight text-indigo-deep">{station.title}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 rounded-full bg-violet/10 px-3 py-1.5 text-[11px] font-bold text-violet">{modeLabel(station.mode)}</span>
                      <SourceChip page={station.page} />
                    </div>
                  </div>
                  <StationView station={station} />
                </>
              )}

              {station && phase.kind === "challenge" && (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[11px] font-bold text-violet">
                      التحدي {phase.i + 1} من {total} · {CHALLENGE_LABELS[station.challenge.kind]}
                    </p>
                    <SourceChip page={station.page} />
                  </div>

                  {run.recovering && (
                    <div role="alert" className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-bold text-amber-900">نفدت قلوبك، لكنك لن تخرج من الدرس.</p>
                      <p className="mt-1 text-xs font-medium leading-6 text-amber-900/80">راجع الفكرة الأهم في المحطة السابقة لتستعيد قلبًا:</p>
                      <p className="mt-2 rounded-xl bg-white px-4 py-3 text-[13px] font-bold text-indigo-deep">«{previous?.keyIdea}»</p>
                      <button onClick={() => dispatch({ type: "recover" })} className="mt-3 rounded-full bg-amber-500 px-6 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-600">
                        راجعتها: أعد لي قلبًا
                      </button>
                    </div>
                  )}

                  <div className={run.recovering ? "pointer-events-none opacity-50" : ""}>
                    <ChallengeView
                      key={phase.i}
                      challenge={station.challenge}
                      disabled={run.recovering || offline}
                      onAttempt={(attempt, correct, choice) => {
                        if (attempt === 1 && choice !== undefined) choices.current[phase.i] = choice;
                        if (!correct) sfx.wrong();
                        else if ((run.streak + 1) % 3 === 0) sfx.streak();
                        else sfx.right();
                        dispatch({ type: "answer", challenge: phase.i, attempt, correct });
                        if (correct || attempt === 2) setResolved((r) => ({ ...r, [phase.i]: true }));
                      }}
                    />
                  </div>
                </>
              )}

              {phase.kind === "surprise" && (
                <div className="py-6 text-center">
                  <span className={`mx-auto grid size-24 place-items-center rounded-3xl bg-gradient-to-br from-sun to-orange-400 text-indigo-deep shadow-lg transition ${opened ? "scale-110 rotate-6" : "animate-bounce"}`}>
                    <Gift className="size-11" />
                  </span>
                  <h2 className="mt-5 text-2xl font-bold text-indigo-deep">صندوق المفاجأة</h2>
                  {!opened ? (
                    <>
                      <p className="mt-1 text-xs font-medium text-indigo-deep/60">أنهيت ثلاثة تحديات. خذ مكافأتك.</p>
                      <button
                        onClick={() => {
                          sfx.streak();
                          dispatch({ type: "surprise" });
                          setOpened(true);
                        }}
                        className="mt-5 rounded-full bg-brand px-9 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30"
                      >
                        افتح الصندوق
                      </button>
                    </>
                  ) : (
                    <p className="mt-2 animate-[pop_.3s_ease-out] text-lg font-bold text-emerald-700">+{POINTS.surprise} نقطة معرفة، وقلب عاد إليك!</p>
                  )}
                </div>
              )}

              {phase.kind === "boss" && <BossView items={lesson.boss} onWin={() => {
                  sfx.boss();
                  dispatch({ type: "boss" });
                }} />}
            </section>

            {saveError && (
              <div role="alert" className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-xs font-bold leading-6 text-rose-800">تعذّر حفظ نتيجتك: {saveError.message}</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button onClick={() => void finish()} className="rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white">
                    حاول مرة أخرى
                  </button>
                  {saveError.needsLogin ? (
                    <Link href={`/login?next=${encodeURIComponent("/join?code=" + joined?.code)}`} className="rounded-full border border-rose-300 bg-white px-5 py-2 text-xs font-bold text-rose-700">
                      سجّل الدخول
                    </Link>
                  ) : (
                    <button onClick={() => void finish(true)} className="rounded-full border border-rose-300 bg-white px-5 py-2 text-xs font-bold text-rose-700">
                      تابع دون حفظ
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => goTo(Math.max(0, run.at - 1))}
                disabled={run.at === 0 || offline}
                className="rounded-full bg-white px-7 py-3 text-xs font-bold text-indigo-deep/60 shadow-sm transition hover:text-indigo-deep disabled:opacity-40"
              >
                السابق
              </button>
              <button
                onClick={() => (isLast ? void finish() : goTo(run.at + 1))}
                disabled={!canNext}
                className="rounded-full bg-brand px-9 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
              >
                {saving ? "جارٍ الحفظ…" : isLast ? "أنهِ الدرس" : "التالي"}
              </button>
            </div>

          </div>

          <aside className="hidden space-y-3 md:block">
            {mapSection}
            {restSection}
          </aside>
        </div>
      </main>

      {/* phone: the leaderboard and the cards, pulled up from the bottom */}
      <button
        onClick={() => setSheet(true)}
        className="fixed inset-x-5 bottom-5 z-30 rounded-full bg-indigo-deep py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-deep/30 md:hidden"
      >
        ترتيبي وبطاقاتي
      </button>
      {sheet && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="ترتيبي وبطاقاتي">
          <button aria-label="أغلق" className="absolute inset-0 bg-indigo-deep/50" onClick={() => setSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[82vh] animate-[pop_.25s_ease-out] space-y-3 overflow-y-auto rounded-t-[28px] bg-lavender p-4 pb-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-indigo-deep">ترتيبي وبطاقاتي</h2>
              <button onClick={() => setSheet(false)} className="rounded-full bg-white px-5 py-2 text-xs font-bold text-violet shadow-sm">
                إغلاق
              </button>
            </div>
            {restSection}
          </div>
        </div>
      )}

      {run.rankUp !== null && (
        <Overlay label="ترقية الرتبة">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-sun text-4xl shadow-lg">🏆</span>
          <h2 className="mt-4 text-2xl font-bold text-indigo-deep">ترقّيت إلى «{RANKS[run.rankUp].name}»!</h2>
          <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/65">
            {nextRank(points) ? `الرتبة التالية «${nextRank(points)!.name}» تبدأ من ${nextRank(points)!.from} نقطة، وبقي لك ${Math.max(0, nextRank(points)!.from - points)}.` : "بلغت أعلى رتبة. أحسنت!"}
          </p>
          <button data-autofocus autoFocus onClick={() => dispatch({ type: "rankSeen" })} className="mt-5 rounded-full bg-brand px-9 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30">
            أكمل
          </button>
        </Overlay>
      )}

      {welcome && (
        <Overlay label="أهلاً بعودتك">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-pink-50 text-3xl">👋</span>
          <h2 className="mt-4 text-2xl font-bold text-indigo-deep">أهلاً بعودتك يا {myName}!</h2>
          <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/65">
            تقدّمك محفوظ. أنت عند {phase.kind === "station" ? `المحطة ${phase.i + 1}` : phase.kind === "challenge" ? `التحدي ${challengeNo + 1}` : "الجزء التالي"} من {total}، ومعك {run.points} نقطة.
          </p>
          <button autoFocus onClick={() => setWelcome(false)} className="mt-5 w-full rounded-full bg-brand px-9 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30">
            {phase.kind === "station" ? `أكمل من المحطة ${phase.i + 1}` : phase.kind === "challenge" ? `أكمل من التحدي ${challengeNo + 1}` : "أكمل من حيث توقفت"}
          </button>
          <button onClick={startOver} className="mt-2.5 w-full rounded-full border border-violet/15 bg-white px-9 py-3 text-sm font-bold text-violet transition hover:border-violet/40">
            ابدأ من جديد
          </button>
        </Overlay>
      )}
    </>
  );
}
