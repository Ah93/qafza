import type { Challenge, Lesson } from "./lesson";

/** one screen of a live session, in the order the teacher walks through them */
export type Slide =
  | { kind: "arena" }
  | { kind: "explain" | "challenge" | "reveal"; i: number }
  | { kind: "finish" };

/** the boss round sits after the last station, so its challenge index equals the number of stations */
export function buildSlides(stations: number): Slide[] {
  const s: Slide[] = [{ kind: "arena" }];
  for (let i = 0; i < stations; i++) s.push({ kind: "explain", i }, { kind: "challenge", i }, { kind: "reveal", i });
  s.push({ kind: "challenge", i: stations }, { kind: "reveal", i: stations }, { kind: "finish" });
  return s;
}

/** index of the reveal slide that closes challenge `i` */
export const revealIndex = (slides: Slide[], i: number) => slides.findIndex((s) => s.kind === "reveal" && s.i === i);

export const POINTS_RIGHT = 10;
export const POINTS_ENGAGE = 2;
export const ENGAGE_CAP_PER_STATION = 6;

/** what a student sends for a challenge */
export type LiveAnswer =
  | { kind: "mcq"; choice: number }
  | { kind: "tf"; value: boolean }
  | { kind: "dnd"; placed: string[] }
  | { kind: "match"; links: number[] }
  | { kind: "boss"; values: boolean[] };

/** how many of the answer's parts are right: a challenge is 0 or 1, the boss round is 0 to 4 */
export function judge(lesson: Lesson, challengeIndex: number, a: LiveAnswer): { right: number; of: number } {
  if (challengeIndex === lesson.stations.length) {
    if (a.kind !== "boss") return { right: 0, of: lesson.boss.length };
    return { right: lesson.boss.reduce((t, b, k) => t + (a.values[k] === b.answer ? 1 : 0), 0), of: lesson.boss.length };
  }
  const ch: Challenge | undefined = lesson.stations[challengeIndex]?.challenge;
  if (!ch || ch.kind !== a.kind) return { right: 0, of: 1 };
  let ok = false;
  if (ch.kind === "mcq" && a.kind === "mcq") ok = a.choice === ch.correct;
  else if (ch.kind === "tf" && a.kind === "tf") ok = a.value === ch.answer;
  else if (ch.kind === "dnd" && a.kind === "dnd") ok = ch.slots.length === a.placed.length && ch.slots.every((s, k) => a.placed[k] === s.card);
  else if (ch.kind === "match" && a.kind === "match") ok = ch.pairs.length === a.links.length && ch.pairs.every((_, k) => a.links[k] === k);
  return { right: ok ? 1 : 0, of: 1 };
}

/* ---------- what the server sends ---------- */

export type GroupScore = { group: number; size: number; score: number };

export type TeacherSnap = {
  code: string;
  status: "running" | "ended";
  at: number;
  maxAt: number;
  slides: number;
  mode: "groups" | "individual";
  boardOnly: boolean;
  groupCount: number;
  className: string | null;
  students: { id: string; name: string; group: number | null; points: number; online: boolean; answered: boolean }[];
  groups: GroupScore[];
  /** students who have answered the challenge on screen */
  answered: number;
  /** students who asked for the explanation on screen to be repeated */
  repeats: number;
  /** for the challenge on screen: how many chose each option (multiple choice and true/false) */
  distribution: number[] | null;
  /** board-only: which groups the teacher marked right, per slide */
  flags: Record<number, boolean[]>;
  top: { name: string; points: number }[];
  rosterSize: number;
};

export type StudentSnap = {
  code: string;
  status: "running" | "ended";
  at: number;
  maxAt: number;
  mode: "groups" | "individual";
  groupCount: number;
  me: {
    id: string;
    name: string;
    group: number | null;
    points: number;
    rank: number;
    /** challenge slides this student already answered */
    answered: number[];
    /** the explanation on screen was already asked to be repeated */
    askedRepeat: boolean;
    /** revealed challenges only: how the student did */
    outcomes: Record<number, { right: number; of: number }>;
    engaged: number;
  };
  groups: GroupScore[];
  top: { name: string; points: number; me: boolean }[];
  count: number;
};

/** the group's shown score: members' points added up, scaled to the biggest group when sizes differ by more than one student */
export function groupScores(sums: number[], sizes: number[]): GroupScore[] {
  const max = Math.max(0, ...sizes);
  const min = Math.min(...sizes);
  return sums.map((sum, group) => ({
    group,
    size: sizes[group],
    score: max - min > 1 && sizes[group] > 0 ? Math.round((sum / sizes[group]) * max) : sum,
  }));
}
