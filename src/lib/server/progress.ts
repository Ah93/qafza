import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { BADGES, rankOf, type BadgeId } from "../play";
import type { AttemptDoc } from "./attempts";
import { dayOf, fs } from "./firestore";
import { getUser } from "./users";

/** days between reviews of a missed question: a correct answer moves it one box up, a wrong one sends it back to the start */
const BOXES = [1, 3, 7, 14, 30];
export const REVIEW_POINTS = 5;
const MAX_POINTS_PER_ATTEMPT = 400;

const BADGE_IDS = new Set<string>(BADGES.map((b) => b.id));
/** badges only the server may award: they depend on facts the client cannot vouch for */
const SERVER_ONLY = new Set<string>(["reviewer", "steady", "sage", "support", "spirit"]);

const progressCol = () => fs().collection("progress");
const mistakesCol = () => fs().collection("mistakes");

const addDays = (day: string, n: number) => dayOf(Date.parse(day + "T00:00:00Z") + n * 86_400_000);

type ProgressDoc = { points: number; streak: number; lastReviewDay: string | null; badges: string[]; cards: Record<string, number[]> };
type MistakeDoc = { userId: string; lessonId: string; station: number; missedAt: number; box: number; dueDay: string };

const EMPTY: ProgressDoc = { points: 0, streak: 0, lastReviewDay: null, badges: [], cards: {} };

async function read(uid: string): Promise<ProgressDoc> {
  const d = await progressCol().doc(uid).get();
  return d.exists ? { ...EMPTY, ...(d.data() as Partial<ProgressDoc>) } : { ...EMPTY };
}

/** the streak a student has right now: it lapses if yesterday had no review */
export function currentStreak(r: Pick<ProgressDoc, "streak" | "lastReviewDay">): number {
  if (!r.lastReviewDay) return 0;
  const today = dayOf();
  return r.lastReviewDay === today || r.lastReviewDay === addDays(today, -1) ? r.streak : 0;
}

export type Progress = {
  points: number;
  rank: string;
  streak: number;
  reviewedToday: boolean;
  badges: BadgeId[];
  /** lesson id -> indexes of the cards collected */
  cards: Record<string, number[]>;
  cardCount: number;
  lessonsDone: number;
  accuracy: number | null;
  since: number;
  dueCount: number;
  history: { lessonId: string; title: string; mode: string; at: number; accuracy: number; code: string }[];
  inProgress: { code: string; title: string; reached: number; total: number } | null;
};

const accuracyOf = (results: (0 | 1 | null)[]) => {
  const x = results.filter((v) => v === 0 || v === 1);
  return x.length ? Math.round((x.reduce<number>((t, v) => t + (v ?? 0), 0) / x.length) * 100) : 0;
};

export async function getProgress(uid: string): Promise<Progress> {
  const [r, user, snap, mistakes] = await Promise.all([
    read(uid),
    getUser(uid),
    fs().collection("attempts").where("studentUserId", "==", uid).get(),
    mistakesCol().where("userId", "==", uid).select("dueDay").get(),
  ]);
  const all = snap.docs.map((d) => d.data() as AttemptDoc);
  const finished = all.filter((a) => a.finishedAt).sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0));
  const open = all.filter((a) => !a.finishedAt && a.mode === "self").sort((a, b) => b.startedAt - a.startedAt)[0];

  // titles and codes for the lessons we are about to show
  const ids = [...new Set([...finished.slice(0, 20).map((a) => a.lessonId), ...(open ? [open.lessonId] : [])])];
  const meta = new Map<string, { title: string; code: string; archived: boolean }>();
  if (ids.length) {
    const docs = await fs().getAll(...ids.map((id) => fs().collection("lessons").doc(id)), { fieldMask: ["title", "code", "archived"] });
    docs.forEach((d) => d.exists && meta.set(d.id, d.data() as { title: string; code: string; archived: boolean }));
  }

  const today = dayOf();
  const openMeta = open ? meta.get(open.lessonId) : undefined;
  return {
    points: r.points,
    rank: rankOf(r.points).name,
    streak: currentStreak(r),
    reviewedToday: r.lastReviewDay === today,
    badges: r.badges as BadgeId[],
    cards: r.cards,
    cardCount: Object.values(r.cards).reduce((t, c) => t + c.length, 0),
    lessonsDone: new Set(finished.map((a) => a.lessonId)).size,
    accuracy: finished.length ? Math.round(finished.reduce((t, a) => t + accuracyOf(a.results), 0) / finished.length) : null,
    since: user?.createdAt ?? Date.now(),
    dueCount: mistakes.docs.filter((d) => (d.data() as { dueDay: string }).dueDay <= today).length,
    history: finished
      .slice(0, 20)
      .filter((a) => meta.has(a.lessonId))
      .map((a) => ({ lessonId: a.lessonId, title: meta.get(a.lessonId)!.title, mode: a.mode, at: a.finishedAt!, accuracy: accuracyOf(a.results), code: meta.get(a.lessonId)!.code })),
    inProgress: open && openMeta && !openMeta.archived ? { code: openMeta.code, title: openMeta.title, reached: open.reached, total: 5 } : null,
  };
}

export async function awardBadges(uid: string, ids: string[]) {
  const valid = ids.filter((id) => BADGE_IDS.has(id));
  if (valid.length) await progressCol().doc(uid).set({ badges: FieldValue.arrayUnion(...valid) }, { merge: true });
}

/** points go up, and the top rank brings its badge */
async function addPoints(uid: string, n: number) {
  const add = Math.max(0, Math.round(n));
  await progressCol().doc(uid).set({ points: FieldValue.increment(add) }, { merge: true });
  if (add && rankOf((await read(uid)).points).name === "حكيم") await awardBadges(uid, ["sage"]);
}

/** a finished lesson: its points, the badges the client earned, the cards, and the misses that go to spaced review */
export async function applyAttempt(uid: string, lessonId: string, a: { points: number; results: (0 | 1 | null)[]; badges: string[]; cards: number[] }) {
  await addPoints(uid, Math.min(MAX_POINTS_PER_ATTEMPT, Math.max(0, Math.round(a.points))));
  await awardBadges(uid, a.badges.filter((b) => !SERVER_ONLY.has(b)));

  const cards = a.cards.filter((c) => Number.isInteger(c) && c >= 0 && c <= 5);
  if (cards.length) {
    const ref = progressCol().doc(uid);
    await fs().runTransaction(async (tx) => {
      const have = ((await tx.get(ref)).data() as Partial<ProgressDoc> | undefined)?.cards ?? {};
      tx.set(ref, { cards: { ...have, [lessonId]: [...new Set([...(have[lessonId] ?? []), ...cards])].sort() } }, { merge: true });
    });
  }

  const tomorrow = addDays(dayOf(), 1);
  await Promise.all(
    a.results.map((v, station) =>
      v === 0
        ? mistakesCol().doc(`${uid}_${lessonId}_${station}`).set({ userId: uid, lessonId, station, missedAt: Date.now(), box: 0, dueDay: tomorrow } satisfies MistakeDoc)
        : null,
    ),
  );
}

export type DueQuestion = { id: string; lessonId: string; station: number; title: string; question: string; options: { text: string; explanation: string }[]; correct: number; missedAt: number };

type LessonData = { stations: { title: string; challenge: Record<string, unknown> }[] };

/** any challenge, turned into one multiple-choice question that is answered once */
function asChoice(ch: Record<string, unknown>, seed: number): { question: string; options: { text: string; explanation: string }[]; correct: number } | null {
  const kind = ch.kind;
  if (kind === "mcq") return { question: String(ch.question), options: ch.options as { text: string; explanation: string }[], correct: Number(ch.correct) };
  if (kind === "tf") {
    const answer = ch.answer === true;
    return {
      question: String(ch.statement),
      options: [
        { text: "صحيحة", explanation: answer ? "" : String(ch.explanation ?? "") },
        { text: "خاطئة", explanation: answer ? String(ch.explanation ?? "") : "" },
      ],
      correct: answer ? 0 : 1,
    };
  }
  if (kind === "dnd") {
    const slots = ch.slots as { label: string; card: string }[];
    const i = seed % slots.length;
    return { question: `ما الذي يخص «${slots[i].label}»؟`, options: slots.map((s, k) => ({ text: s.card, explanation: k === i ? "" : `هذا يخص «${s.label}».` })), correct: i };
  }
  if (kind === "match") {
    const pairs = ch.pairs as { term: string; meaning: string }[];
    const i = seed % pairs.length;
    return { question: `ما وصف «${pairs[i].term}»؟`, options: pairs.map((p, k) => ({ text: p.meaning, explanation: k === i ? "" : `هذا وصف «${p.term}».` })), correct: i };
  }
  return null;
}

/** the questions due today (at most `limit`): the oldest misses first */
export async function dueQuestions(uid: string, limit = 3): Promise<DueQuestion[]> {
  const today = dayOf();
  const snap = await mistakesCol().where("userId", "==", uid).get();
  const due = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as MistakeDoc) }))
    .filter((m) => m.dueDay <= today)
    .sort((a, b) => a.missedAt - b.missedAt)
    .slice(0, limit * 2); // a few spare in case a lesson was deleted or archived

  const out: DueQuestion[] = [];
  for (const m of due) {
    if (out.length >= limit) break;
    const d = await fs().collection("lessons").doc(m.lessonId).get();
    const data = d.data() as { archived?: boolean; data?: string } | undefined;
    if (!data || data.archived || !data.data) continue;
    let lesson: LessonData;
    try {
      lesson = JSON.parse(data.data) as LessonData;
    } catch {
      continue;
    }
    const st = lesson.stations[m.station];
    const q = st ? asChoice(st.challenge, m.missedAt) : null;
    if (st && q) out.push({ id: m.id, lessonId: m.lessonId, station: m.station, title: st.title, ...q, missedAt: m.missedAt });
  }
  return out;
}

/** one review answer: moves the question along its boxes, pays the points, keeps the daily streak */
export async function answerReview(uid: string, mistakeId: string, correct: boolean): Promise<{ points: number; streak: number; mastered: boolean } | null> {
  const ref = mistakesCol().doc(mistakeId);
  const d = await ref.get();
  const m = d.data() as MistakeDoc | undefined;
  if (!m || m.userId !== uid) return null;
  const today = dayOf();
  let mastered = false;

  if (correct) {
    const box = m.box + 1;
    if (box >= BOXES.length) {
      await ref.delete();
      mastered = true;
    } else await ref.update({ box, dueDay: addDays(today, BOXES[box]) });
    await addPoints(uid, REVIEW_POINTS);
    await awardBadges(uid, ["reviewer"]);
  } else await ref.update({ box: 0, dueDay: addDays(today, 1) });

  // any review answer counts as a day of practice
  const r = await read(uid);
  if (r.lastReviewDay !== today) {
    const streak = r.lastReviewDay === addDays(today, -1) ? r.streak + 1 : 1;
    await progressCol().doc(uid).set({ streak, lastReviewDay: today }, { merge: true });
    if (streak >= 7) await awardBadges(uid, ["steady"]);
  }
  const after = await read(uid);
  return { points: after.points, streak: currentStreak(after), mastered };
}
