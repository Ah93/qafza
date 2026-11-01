export type ClassKind = "school" | "university" | "training" | "private";

export const CLASS_KIND_LABEL: Record<ClassKind, string> = {
  school: "مدرسة",
  university: "جامعة",
  training: "تدريب",
  private: "تدريس خاص",
};

export type ClassStudent = {
  id: string;
  name: string;
  /** has an account, so results follow the student across lessons and classes */
  registered: boolean;
  /** lessons of this class the student has finished */
  done: number;
  /** average first-attempt mastery over the lessons finished, 0-100; null before the first lesson */
  mastery: number | null;
};

export type ClassInfo = {
  id: string;
  name: string;
  kind: ClassKind;
  stage: string;
  subject: string;
  code: string;
  requireLogin: boolean;
  groups: 0 | 2 | 3 | 4;
  /** how many lessons are assigned to the class: what "done" counts against */
  required: number;
  students: ClassStudent[];
};

export const STRUGGLING_BELOW = 60;
export const MASTERED_FROM = 85;

/** Arabic count phrase: 6 طلاب, 26 طالبًا */
export function studentsLabel(n: number) {
  if (n === 0) return "لا طلاب بعد";
  if (n === 1) return "طالب واحد";
  if (n === 2) return "طالبان";
  return n <= 10 ? `${n} طلاب` : `${n} طالبًا`;
}

export const hasPlayed = (s: ClassStudent) => s.mastery !== null;

export function classStats(c: ClassInfo) {
  const n = c.students.length;
  if (n === 0) return null;
  const played = c.students.filter(hasPlayed);
  const required = Math.max(1, c.required);
  return {
    avg: played.length ? Math.round(played.reduce((t, x) => t + (x.mastery ?? 0), 0) / played.length) : null,
    completion: c.required === 0 ? null : Math.round((c.students.reduce((t, x) => t + Math.min(x.done, required), 0) / (n * required)) * 100),
    struggling: played.filter((x) => (x.mastery ?? 0) < STRUGGLING_BELOW).length,
    registered: c.students.filter((x) => x.registered).length,
  };
}

export const statusOf = (mastery: number | null): "متقن" | "متعثّر" | null =>
  mastery === null ? null : mastery >= MASTERED_FROM ? "متقن" : mastery < STRUGGLING_BELOW ? "متعثّر" : null;

/**
 * Split students into balanced groups: strongest first, dealt back and forth ("snake"),
 * so both head-count and average mastery stay close. Students who have not played yet count as average.
 */
export function balanceGroups(students: ClassStudent[], count: number): number[][] {
  const known = students.filter(hasPlayed);
  const avg = known.length ? known.reduce((t, s) => t + (s.mastery ?? 0), 0) / known.length : 50;
  const score = (s: ClassStudent) => s.mastery ?? avg;
  const order = students.map((_, i) => i).sort((a, b) => score(students[b]) - score(students[a]));
  const out: number[][] = Array.from({ length: count }, () => []);
  order.forEach((idx, k) => {
    const round = Math.floor(k / count);
    const pos = round % 2 === 0 ? k % count : count - 1 - (k % count);
    out[pos].push(idx);
  });
  return out;
}
