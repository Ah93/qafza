import type { ModeId } from "@/lib/lesson";
import { MAX_HEARTS, POINTS, STREAK_EVERY, rankIndex, type BadgeId } from "@/lib/play";

export type Phase =
  | { kind: "station"; i: number }
  | { kind: "challenge"; i: number }
  | { kind: "surprise" }
  | { kind: "boss" }
  | { kind: "done" };

/** station, challenge, … with the surprise box right after challenge 3, then the boss */
export function buildSequence(stations: number): Phase[] {
  const seq: Phase[] = [];
  for (let i = 0; i < stations; i++) {
    seq.push({ kind: "station", i }, { kind: "challenge", i });
    if (i === 2) seq.push({ kind: "surprise" });
  }
  seq.push({ kind: "boss" }, { kind: "done" });
  return seq;
}

export type Run = {
  at: number;
  points: number;
  /** points the student already had before this lesson (decides the rank) */
  startPoints: number;
  hearts: number;
  streak: number;
  bestStreak: number;
  right: number;
  wrong: number;
  cards: number[];
  badges: BadgeId[];
  firstTry: Record<number, boolean>;
  modes: ModeId[];
  /** out of hearts: the student reviews the previous station to win one back */
  recovering: boolean;
  /** rank index to celebrate */
  rankUp: number | null;
  bossBeaten: boolean;
};

export const initialRun = (startPoints = 0): Run => ({
  at: 0,
  points: 0,
  startPoints,
  hearts: MAX_HEARTS,
  streak: 0,
  bestStreak: 0,
  right: 0,
  wrong: 0,
  cards: [],
  badges: [],
  firstTry: {},
  modes: [],
  recovering: false,
  rankUp: null,
  bossBeaten: false,
});

export type Action =
  | { type: "go"; to: number }
  | { type: "mode"; mode: ModeId }
  | { type: "answer"; challenge: number; attempt: 1 | 2; correct: boolean }
  | { type: "surprise" }
  | { type: "boss" }
  | { type: "engage" }
  | { type: "recover" }
  | { type: "rankSeen" }
  | { type: "simulateRankUp" }
  | { type: "restore"; at: number; points: number; results: (0 | 1 | null)[] }
  | { type: "reset"; startPoints?: number };

const addBadge = (list: BadgeId[], id: BadgeId) => (list.includes(id) ? list : [...list, id]);

/** apply a point change and remember a rank-up if one happened */
function gain(run: Run, amount: number): Run {
  const before = rankIndex(run.startPoints + run.points);
  const points = run.points + amount;
  const after = rankIndex(run.startPoints + points);
  return { ...run, points, rankUp: after > before ? after : run.rankUp };
}

export function reducer(run: Run, a: Action): Run {
  switch (a.type) {
    case "go":
      return { ...run, at: a.to };

    case "mode":
      return run.modes.includes(a.mode) ? run : { ...run, modes: [...run.modes, a.mode] };

    case "answer": {
      if (a.correct) {
        let next = gain(run, a.attempt === 1 ? POINTS.first : POINTS.second);
        const streak = run.streak + 1;
        next = {
          ...next,
          streak,
          bestStreak: Math.max(run.bestStreak, streak),
          right: run.right + 1,
          firstTry: { ...run.firstTry, [a.challenge]: a.attempt === 1 },
          cards: a.attempt === 1 && !run.cards.includes(a.challenge) ? [...run.cards, a.challenge] : run.cards,
        };
        if (streak % STREAK_EVERY === 0) next = { ...gain(next, POINTS.streak), badges: addBadge(next.badges, "blazing") };
        return next;
      }
      const hearts = Math.max(0, run.hearts - 1);
      return {
        ...run,
        hearts,
        streak: 0,
        wrong: run.wrong + 1,
        firstTry: a.attempt === 2 ? { ...run.firstTry, [a.challenge]: false } : run.firstTry,
        recovering: hearts === 0,
      };
    }

    case "surprise":
      return { ...gain(run, POINTS.surprise), hearts: Math.min(MAX_HEARTS, run.hearts + 1) };

    case "boss": {
      const next = gain(run, POINTS.boss);
      return {
        ...next,
        bossBeaten: true,
        cards: run.cards.includes(5) ? run.cards : [...run.cards, 5],
        badges: addBadge(next.badges, "boss"),
      };
    }

    case "engage":
      return gain(run, POINTS.engage);

    case "recover":
      return { ...run, hearts: Math.min(MAX_HEARTS, run.hearts + 1), recovering: false };

    case "rankSeen":
      return { ...run, rankUp: null };

    case "simulateRankUp":
      return { ...run, rankUp: Math.min(3, rankIndex(run.startPoints + run.points) + 1) };

    case "restore": {
      // a student who left comes back: what the server saved is put back, the rest starts fresh
      const firstTry: Record<number, boolean> = {};
      a.results.forEach((v, i) => {
        if (v === 1) firstTry[i] = true;
        else if (v === 0) firstTry[i] = false;
      });
      const wrong = a.results.filter((v) => v === 0).length;
      return {
        ...run,
        at: a.at,
        points: a.points,
        firstTry,
        right: a.results.filter((v) => v === 1).length,
        wrong,
        cards: a.results.flatMap((v, i) => (v === 1 ? [i] : [])),
        hearts: Math.max(1, MAX_HEARTS - wrong),
      };
    }

    case "reset":
      return initialRun(a.startPoints ?? run.startPoints);
  }
}

/** badges decided at the end of the lesson */
export function finalBadges(run: Run): BadgeId[] {
  let list = run.badges;
  if (run.wrong === 0 && run.bossBeaten) list = addBadge(list, "flawless");
  if (run.modes.length >= 5) list = addBadge(list, "explorer");
  if (run.cards.length >= 6) list = addBadge(list, "collector");
  return list;
}

export const accuracy = (run: Run) => {
  const total = run.right + run.wrong;
  return total === 0 ? 100 : Math.round((run.right / total) * 100);
};
