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
  /** the group the teacher put this student in by hand (0-based), or null to let قفزة place them */
  group: number | null;
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
  /** students below this mastery (%) count as struggling: the teacher decides */
  struggleBelow: number;
  /** how many lessons are assigned to the class: what "done" counts against */
  required: number;
  students: ClassStudent[];
};

/** the default line for "struggling"; each class can set its own */
export const STRUGGLING_BELOW = 60;
export const STRUGGLE_CHOICES = [40, 50, 55, 60, 65, 70, 75, 80];

/** the link a student opens to join with the code already filled in */
export const joinLink = (origin: string, code: string) => `${origin}/join?code=${code}`;
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
    struggling: played.filter((x) => (x.mastery ?? 0) < c.struggleBelow).length,
    registered: c.students.filter((x) => x.registered).length,
  };
}

export const statusOf = (mastery: number | null, below = STRUGGLING_BELOW): "متقن" | "متعثّر" | null =>
  mastery === null ? null : mastery >= MASTERED_FROM ? "متقن" : mastery < below ? "متعثّر" : null;

/**
 * Split students into balanced groups. Students the teacher placed by hand stay where they were put; the others are
 * dealt strongest first, each to the group that has the fewest students (the weaker group on a tie), so head-count
 * stays within one and the average mastery stays close. Students who have not played yet count as average.
 */
export function balanceGroups(students: ClassStudent[], count: number): number[][] {
  const known = students.filter(hasPlayed);
  const avg = known.length ? known.reduce((t, s) => t + (s.mastery ?? 0), 0) / known.length : 50;
  const score = (s: ClassStudent) => s.mastery ?? avg;
  const out: number[][] = Array.from({ length: count }, () => []);
  const sums = Array(count).fill(0) as number[];

  const free: number[] = [];
  students.forEach((s, i) => {
    if (s.group !== null && s.group >= 0 && s.group < count) {
      out[s.group].push(i);
      sums[s.group] += score(s);
    } else free.push(i);
  });
  free.sort((a, b) => score(students[b]) - score(students[a]));
  for (const idx of free) {
    let best = 0;
    for (let g = 1; g < count; g++) if (out[g].length < out[best].length || (out[g].length === out[best].length && sums[g] < sums[best])) best = g;
    out[best].push(idx);
    sums[best] += score(students[idx]);
  }
  return out;
}
