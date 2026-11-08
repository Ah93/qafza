import "server-only";
import type { User } from "./auth";
import { enrol } from "./classes";
import { fs, newId } from "./firestore";
import { loadLesson } from "./lessons";
import { applyAttempt } from "./progress";

export type AttemptInput = {
  id?: string;
  code: string;
  name: string;
  ref: string;
  mode: "self" | "live";
  groupIdx?: number | null;
  /** first-try outcome per challenge: 1 right, 0 wrong, null not reached */
  results: (0 | 1 | null)[];
  /** the option picked on the first try, per challenge (multiple choice: index; true/false: 0 true, 1 false), or null */
  choices: (number | null)[];
  boss: (0 | 1)[];
  points: number;
  reached: number;
  minutes: number;
  finished: boolean;
  badges: string[];
  cards: number[];
};

export type AttemptDoc = {
  lessonId: string;
  classId: string | null;
  studentName: string;
  studentUserId: string | null;
  studentRef: string;
  mode: "self" | "live";
  groupIdx: number | null;
  startedAt: number;
  finishedAt: number | null;
  points: number;
  results: (0 | 1 | null)[];
  choices?: (number | null)[];
  boss: (0 | 1)[];
  reached: number;
  minutes: number;
};

export type SaveResult = { ok: true; id: string; finished: boolean } | { ok: false; status: number; error: string; needsLogin?: boolean };

const attempts = () => fs().collection("attempts");
const cell = (v: unknown): 0 | 1 | null => (v === 1 || v === true ? 1 : v === 0 || v === false ? 0 : null);

export function cleanInput(b: Record<string, unknown>): AttemptInput | null {
  const code = typeof b.code === "string" ? b.code.toUpperCase() : "";
  const name = typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ").slice(0, 40) : "";
  const ref = typeof b.ref === "string" ? b.ref.slice(0, 64) : "";
  if (!/^[A-Z0-9]{4}$/.test(code) || !name || ref.length < 8) return null;
  const arr = (v: unknown, n: number) => (Array.isArray(v) ? v.slice(0, n) : []);
  const results = arr(b.results, 5).map(cell);
  while (results.length < 5) results.push(null);
  const choices = arr(b.choices, 5).map((v) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 3 ? (v as number) : null));
  while (choices.length < 5) choices.push(null);
  return {
    id: typeof b.id === "string" && b.id.length <= 64 ? b.id : undefined,
    code,
    name,
    ref,
    mode: b.mode === "live" ? "live" : "self",
    groupIdx: Number.isInteger(b.groupIdx) ? (b.groupIdx as number) : null,
    results,
    choices,
    boss: arr(b.boss, 4).map((v) => (v === 1 || v === true ? 1 : 0)),
    points: Number.isFinite(Number(b.points)) ? Number(b.points) : 0,
    reached: Math.min(10, Math.max(0, Math.round(Number(b.reached) || 0))),
    minutes: Math.min(600, Math.max(0, Number(b.minutes) || 0)),
    finished: b.finished === true,
    badges: arr(b.badges, 12).filter((x): x is string => typeof x === "string"),
    cards: arr(b.cards, 6).filter((x): x is number => Number.isInteger(x)),
  };
}

/** write one finished live attempt (the live session saves everyone's at once, when it ends) */
export async function recordAttempt(d: AttemptDoc): Promise<string> {
  const id = newId();
  await attempts().doc(id).set(d);
  return id;
}

/** create or update one student's attempt at a lesson; a finished attempt is never changed again */
export async function saveAttempt(user: User | null, a: AttemptInput): Promise<SaveResult> {
  const found = await loadLesson("code", a.code);
  if (!found || found.row.archived || found.row.status !== "published") return { ok: false, status: 404, error: "لا نعرف هذا الرمز." };
  if (found.share.requireLogin && !user) return { ok: false, status: 403, error: "اشترط معلّمك تسجيل الدخول لهذا الدرس.", needsLogin: true };

  const classId = found.row.classId;
  if (classId) {
    const c = await fs().collection("classes").doc(classId).get();
    if (c.exists && (c.data() as { requireLogin?: boolean }).requireLogin && !user) return { ok: false, status: 403, error: "هذا الصف يشترط تسجيل الدخول.", needsLogin: true };
    await enrol(classId, a.name, user?.id ?? null);
  }

  const existing = a.id ? await attempts().doc(a.id).get() : null;
  if (existing?.exists) {
    const e = existing.data() as AttemptDoc;
    if (e.studentRef !== a.ref || e.lessonId !== found.row.id) return { ok: false, status: 403, error: "هذه المحاولة ليست لك." };
    if (e.finishedAt) return { ok: true, id: existing.id, finished: true };
    await existing.ref.update({ results: a.results, choices: a.choices, boss: a.boss, points: Math.max(0, Math.round(a.points)), reached: a.reached, minutes: a.minutes, finishedAt: a.finished ? Date.now() : null });
  } else {
    const doc: AttemptDoc = {
      lessonId: found.row.id,
      classId,
      studentName: a.name,
      studentUserId: user?.id ?? null,
      studentRef: a.ref,
      mode: "self",
      groupIdx: a.groupIdx ?? null,
      startedAt: Date.now(),
      finishedAt: a.finished ? Date.now() : null,
      points: Math.max(0, Math.round(a.points)),
      results: a.results,
      choices: a.choices,
      boss: a.boss,
      reached: a.reached,
      minutes: a.minutes,
    };
    a.id = await recordAttempt(doc);
  }

  const id = existing?.exists ? existing.id : a.id!;
  if (a.finished && user) await applyAttempt(user.id, found.row.id, { points: a.points, results: a.results, badges: a.badges, cards: a.cards });
  return { ok: true, id, finished: a.finished };
}
