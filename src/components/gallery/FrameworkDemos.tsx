"use client";

import * as plural from "@/lib/plural";
import { useEffect, useRef, useState } from "react";
import { Gift, Heart, Sparkles, Trophy } from "lucide-react";
import { GROUP_POOL } from "@/lib/live";
import { nextRank, rankOf } from "@/lib/play";
import { Stage } from "./GalleryShell";

const press = "rounded-full bg-white px-4 py-2 text-xs font-bold text-indigo-deep shadow-sm transition hover:bg-white/90 disabled:opacity-50";

/* ---------- 1. leaderboard and ranks ---------- */

const PEERS = [
  { name: "ليلى", base: 70 },
  { name: "أحمد", base: 45 },
  { name: "منى", base: 20 },
];

export function LeaderboardDemo() {
  const [mine, setMine] = useState(30);
  const rank = rankOf(mine);
  const next = nextRank(mine);
  const rows = [...PEERS.map((p) => ({ ...p, me: false, score: p.base })), { name: "أنت", base: 0, me: true, score: mine }].sort((a, b) => b.score - a.score);
  const pct = next ? Math.round(((mine - rank.from) / (next.from - rank.from)) * 100) : 100;
  return (
    <Stage className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-[13px] font-bold">
        <span className="rounded-full bg-sun px-3 py-1 text-xs text-indigo-deep">الرتبة: {rank.name}</span>
        <span>{plural.points(mine)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="التقدّم إلى الرتبة التالية">
        <div className="h-full rounded-full bg-gradient-to-l from-pink-400 to-sun transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] font-medium text-white/75">{next ? `بقي ${plural.points(next.from - mine)} لرتبة «${next.name}»` : "بلغت أعلى رتبة"}</p>
      <ol className="space-y-1.5" aria-live="polite">
        {rows.map((r, i) => (
          <li key={r.name} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold ${r.me ? "bg-white/25 ring-1 ring-white/40" : "bg-white/10"}`}>
            <span className="w-3 text-[10px] text-white/60">{i + 1}</span>
            <span className="flex-1">{r.name}</span>
            <span>{r.score}</span>
          </li>
        ))}
      </ol>
      <div className="flex gap-2">
        <button className={press} onClick={() => setMine((m) => m + 10)}>
          إجابة صحيحة +10
        </button>
        <button className={`${press} bg-white/15 text-white hover:bg-white/25`} onClick={() => setMine(30)}>
          أعد
        </button>
      </div>
    </Stage>
  );
}

/* ---------- 3. group challenge ---------- */

export function GroupsDemo() {
  const groups = GROUP_POOL.slice(0, 3);
  const [score, setScore] = useState([30, 20, 10]);
  const max = Math.max(1, ...score);
  const lead = score.indexOf(Math.max(...score));
  return (
    <Stage className="flex flex-col gap-3">
      <ul className="space-y-2.5" aria-live="polite">
        {groups.map((g, i) => (
          <li key={g.id}>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-[3px]" style={{ background: g.color }} />
                مجموعة {g.name}
                {i === lead && <Trophy className="size-3.5 text-sun" />}
              </span>
              <span>{score[i]}</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(score[i] / max) * 100}%`, background: g.color }} />
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {groups.map((g, i) => (
          <button key={g.id} className={press} onClick={() => setScore((s) => s.map((v, k) => (k === i ? v + 10 : v)))}>
            +10 للـ{g.name}
          </button>
        ))}
        <button className={`${press} bg-white/15 text-white hover:bg-white/25`} onClick={() => setScore([30, 20, 10])}>
          أعد
        </button>
      </div>
      <p className="text-[11px] font-medium text-white/75">تُجمع نقاط أعضاء كل مجموعة، فيتعاون الصف ويتنافس معًا.</p>
    </Stage>
  );
}

/* ---------- 4. race against time ---------- */

const RACE_SECONDS = 8;

export function RaceDemo() {
  const [left, setLeft] = useState<number | null>(null);
  const [won, setWon] = useState<number | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (left === null || left <= 0 || won !== null) return;
    tick.current = setInterval(() => setLeft((l) => (l === null ? l : Math.max(0, l - 0.1))), 100);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [left, won]);

  const running = left !== null && left > 0 && won === null;
  const out = left !== null && left <= 0 && won === null;
  return (
    <Stage className="flex flex-col gap-3">
      <p className="text-[15px] font-bold">ما أكثر خلايا الدم عددًا؟</p>
      <div className="h-3 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="الوقت المتبقي" aria-valuemin={0} aria-valuemax={RACE_SECONDS} aria-valuenow={Math.round(left ?? RACE_SECONDS)}>
        <div className={`h-full rounded-full transition-[width] duration-100 ${left !== null && left < 3 ? "bg-rose-400" : "bg-mint"}`} style={{ width: `${((left ?? RACE_SECONDS) / RACE_SECONDS) * 100}%` }} />
      </div>
      <p className="text-xs font-bold text-white/85" aria-live="polite">
        {won !== null ? `أجبت بسرعة: +${won} نقطة` : out ? "انتهى الوقت، فلا نقاط سرعة" : running ? `${Math.ceil(left!)} ثوانٍ` : "كلما أجبت أسرع، ربحت نقاط سرعة أكثر."}
      </p>
      <div className="flex gap-2">
        {!running ? (
          <button className={press} onClick={() => { setWon(null); setLeft(RACE_SECONDS); }}>
            {left === null ? "ابدأ السؤال" : "أعد المحاولة"}
          </button>
        ) : (
          <button className={press} onClick={() => setWon(Math.max(1, Math.round(left! * 2)))}>
            الإجابة: كريات الدم الحمراء
          </button>
        )}
      </div>
    </Stage>
  );
}

/* ---------- 5. box of secrets ---------- */

const PRIZES = [
  { icon: Sparkles, text: "+40 نقطة معرفة" },
  { icon: Heart, text: "قلب إضافي" },
  { icon: Gift, text: "بطاقة نادرة" },
];

export function SecretsDemo() {
  const [order, setOrder] = useState([0, 1, 2]);
  const [open, setOpen] = useState<number | null>(null);
  function again() {
    setOpen(null);
    setOrder((o) => [...o].sort(() => Math.random() - 0.5));
  }
  return (
    <Stage className="flex flex-col gap-3">
      <p className="text-[13px] font-bold">اختر صندوقًا واحدًا فقط.</p>
      <div className="grid grid-cols-3 gap-2.5">
        {order.map((p, i) => {
          const prize = PRIZES[p];
          const Icon = prize.icon;
          const shown = open === i;
          return (
            <button
              key={i}
              disabled={open !== null}
              onClick={() => setOpen(i)}
              aria-label={shown ? prize.text : `صندوق ${i + 1}`}
              className={`grid h-24 place-items-center rounded-2xl text-center text-[11px] font-bold transition ${shown ? "bg-sun text-indigo-deep" : "bg-white/15 hover:bg-white/25"} ${open !== null && !shown ? "opacity-40" : ""}`}
            >
              <span>
                <Icon className="mx-auto size-6" />
                <span className="mt-1.5 block">{shown ? prize.text : "؟"}</span>
              </span>
            </button>
          );
        })}
      </div>
      <button className={`${press} w-fit`} onClick={again}>
        {open === null ? "اخلط الصناديق" : "جرّب مرة أخرى"}
      </button>
    </Stage>
  );
}
