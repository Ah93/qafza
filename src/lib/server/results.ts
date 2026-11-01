import "server-only";
import type { Challenge, ShareConfig } from "../lesson";
import { attemptMastery } from "./classes";
import type { AttemptDoc } from "./attempts";
import { fs } from "./firestore";
import { loadLesson } from "./lessons";

export type ReportStudent = {
  name: string;
  registered: boolean;
  status: "done" | "going" | "none";
  /** stations reached in the furthest attempt (0 to 5) */
  reached: number;
  attempts: { at: number; finished: boolean; answers: (boolean | null)[] }[];
  /** "4 من 5" for the latest attempt, or an em dash */
  lastScore: string;
  lastAt: number | null;
  /** first finished attempt, share right on the first try */
  mastery: number | null;
  /** one line for the teacher: what to do with this student */
  tip: string;
};

export type LessonReport = {
  lesson: { id: string; title: string; code: string; how: ShareConfig["how"]; className: string | null; classId: string | null; dueAt: number | null };
  share: ShareConfig;
  stationTitles: string[];
  counts: { done: number; going: number; none: number; total: number };
  /** class-wide: mean of the students' first-attempt mastery */
  mastery: number | null;
  minutes: number | null;
  /** per challenge: share right on the first try among those who reached it */
  challenges: { label: string; pct: number | null; answered: number }[];
  weakest: { index: number; pct: number; question: string; hint: string } | null;
  students: ReportStudent[];
};

const questionOf = (c: Challenge) => (c.kind === "mcq" ? c.question : c.kind === "tf" ? c.statement : c.prompt);
const KIND_LABEL: Record<Challenge["kind"], string> = { mcq: "اختيار من متعدد", tf: "صح أو خطأ", dnd: "سحب وإفلات", match: "مطابقة" };
const ORDER = { done: 0, going: 1, none: 2 } as const;

/** every attempt at one lesson, rolled up per student; null when the lesson is not this teacher's */
export async function lessonReport(uid: string, lessonId: string): Promise<LessonReport | null> {
  const found = await loadLesson("id", lessonId, uid);
  if (!found) return null;
  const { row, lesson, share } = found;

  const [snap, klass, rosterDocs] = await Promise.all([
    fs().collection("attempts").where("lessonId", "==", lessonId).get(),
    row.classId ? fs().collection("classes").doc(row.classId).get() : Promise.resolve(null),
    row.classId ? fs().collection("classes").doc(row.classId).collection("students").get() : Promise.resolve(null),
  ]);
  const attempts = snap.docs.map((d) => d.data() as AttemptDoc).sort((a, b) => a.startedAt - b.startedAt);

  // the class roster comes first, so students who never opened the lesson still show up
  const people = new Map<string, { name: string; userId: string | null; mine: AttemptDoc[] }>();
  const keyOf = (name: string, userId: string | null) => (userId ? `u:${userId}` : `n:${name}`);
  for (const d of rosterDocs?.docs ?? []) {
    const s = d.data() as { name: string; userId: string | null };
    people.set(keyOf(s.name, s.userId), { name: s.name, userId: s.userId, mine: [] });
  }
  for (const a of attempts) {
    // a roster student is matched by account or by name, so a guest attempt lands on the right row
    let key = keyOf(a.studentName, a.studentUserId);
    if (!people.has(key)) {
      const byName = [...people.entries()].find(([, p]) => p.name === a.studentName);
      if (byName) key = byName[0];
      else people.set(key, { name: a.studentName, userId: a.studentUserId, mine: [] });
    }
    people.get(key)!.mine.push(a);
  }

  const total = lesson.stations.length;
  const students: ReportStudent[] = [...people.values()].map((p) => {
    const finished = p.mine.filter((a) => a.finishedAt);
    const status: ReportStudent["status"] = !p.mine.length ? "none" : finished.length ? "done" : "going";
    const reached = Math.min(total, Math.max(0, ...p.mine.map((a) => (a.finishedAt ? total : a.reached))));
    const last = p.mine[p.mine.length - 1];
    const firstDone = finished[0];
    const raw = firstDone ? attemptMastery(firstDone.results) : null;
    const mastery = raw === null ? null : Math.round(raw);
    const answered = last ? last.results.filter((x) => x !== null) : [];
    const worst = firstDone ? firstDone.results.findIndex((x) => x === 0) : -1;
    return {
      name: p.name,
      registered: !!p.userId,
      status,
      reached,
      attempts: p.mine.map((a) => ({ at: a.finishedAt ?? a.startedAt, finished: !!a.finishedAt, answers: a.results.slice(0, total).map((x) => (x === null ? null : x === 1)) })),
      lastScore: last ? `${answered.filter((x) => x === 1).length} من ${answered.length}` : "—",
      lastAt: last ? (last.finishedAt ?? last.startedAt) : null,
      mastery,
      tip:
        status === "none"
          ? "لم يفتح الدرس بعد: ذكّره بالرمز."
          : status === "going"
            ? `لم يُكمل المحطة ${Math.min(total, reached + 1)}: شجّعه على المتابعة.`
            : mastery !== null && mastery >= 90
              ? "أتقن الأهداف: رشّحه لتحدٍّ أصعب أو لمساعدة زملائه."
              : mastery !== null && mastery < 60 && worst >= 0
                ? `تعثّر من المحاولة الأولى، وأولى أخطائه في التحدي ${worst + 1}: راجعا المحطة معًا.`
                : `أتمّ الدرس بإتقان ${mastery ?? 0}% من المحاولة الأولى.`,
    };
  });
  students.sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name, "ar"));

  // first attempt of every student who started, per challenge
  const firsts = [...people.values()].map((p) => p.mine[0]).filter(Boolean);
  const challenges = lesson.stations.map((s, i) => {
    const seen = firsts.map((a) => a.results[i]).filter((x) => x === 0 || x === 1);
    return {
      label: `التحدي ${i + 1} · ${s.title}`,
      pct: seen.length ? Math.round((seen.filter((x) => x === 1).length / seen.length) * 100) : null,
      answered: seen.length,
    };
  });
  const scored = challenges.map((c, i) => ({ ...c, i })).filter((c): c is typeof c & { pct: number } => c.pct !== null && c.answered >= 2);
  const worstC = scored.sort((a, b) => a.pct - b.pct)[0];
  const ch = worstC ? lesson.stations[worstC.i].challenge : null;
  const weakest = worstC && ch && worstC.pct < 70 ? { index: worstC.i, pct: worstC.pct, question: questionOf(ch), hint: KIND_LABEL[ch.kind] } : null;

  const masteries = students.map((s) => s.mastery).filter((m): m is number => m !== null);
  const mins = attempts.filter((a) => a.finishedAt && a.minutes > 0).map((a) => a.minutes);
  const className = klass?.exists ? (klass.data() as { name: string }).name : null;
  return {
    lesson: { id: lessonId, title: lesson.title, code: row.code, how: share.how, className, classId: row.classId, dueAt: share.dueAt },
    share,
    stationTitles: lesson.stations.map((s) => s.title),
    counts: { done: students.filter((s) => s.status === "done").length, going: students.filter((s) => s.status === "going").length, none: students.filter((s) => s.status === "none").length, total: students.length },
    mastery: masteries.length ? Math.round(masteries.reduce((t, v) => t + v, 0) / masteries.length) : null,
    minutes: mins.length ? Math.round(mins.reduce((t, v) => t + v, 0) / mins.length) : null,
    challenges,
    weakest,
    students,
  };
}
