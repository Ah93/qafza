import "server-only";
import { randomBytes } from "node:crypto";
import { balanceGroups, type ClassStudent } from "../classes";
import type { Lesson, ShareConfig } from "../lesson";
import {
  ENGAGE_CAP_PER_STATION,
  POINTS_ENGAGE,
  POINTS_RIGHT,
  buildSlides,
  groupScores,
  judge,
  revealIndex,
  type LiveAnswer,
  type Slide,
  type StudentSnap,
  type TeacherSnap,
} from "../live-flow";
import { recordAttempt } from "./attempts";
import { enrol, listClasses } from "./classes";
import { loadLesson } from "./lessons";
import { applyAttempt, awardBadges } from "./progress";

type Answer = { answer: LiveAnswer; right: number; of: number };

type LStudent = {
  id: string;
  name: string;
  ref: string;
  userId: string | null;
  group: number | null;
  answers: Map<number, Answer>;
  engaged: Map<number, number>;
  /** slides where the student asked for the explanation again */
  repeats: Set<number>;
  bonus: number;
  conns: number;
};

type Session = {
  code: string;
  lessonId: string;
  ownerId: string;
  lesson: Lesson;
  slides: Slide[];
  share: ShareConfig;
  classId: string | null;
  className: string | null;
  at: number;
  maxAt: number;
  /** slides that were actually on screen at some point (jumping past a challenge does not show it) */
  visited: Set<number>;
  status: "running" | "ended";
  students: Map<string, LStudent>;
  /** board-only: the teacher's right/wrong mark per group, keyed by challenge index */
  flags: Record<number, boolean[]>;
  groupBonus: number[];
  /** the class roster, already dealt into balanced groups */
  roster: { name: string; group: number }[];
  listeners: Set<() => void>;
  openedAt: number;
  touched: number;
  persisted: boolean;
  pending: ReturnType<typeof setTimeout> | null;
};

const g = globalThis as unknown as { __qafzaLive?: Map<string, Session> };
const sessions = (g.__qafzaLive ??= new Map());

const IDLE_MS = 3 * 3_600_000;

/** sessions nobody touched for hours are closed (and their results saved) the next time anyone asks */
function sweep() {
  const now = Date.now();
  for (const [code, s] of sessions) {
    if (now - s.touched < IDLE_MS) continue;
    if (!s.persisted) persist(s).catch((e) => console.error("[qafza] saving an idle live session failed:", e));
    sessions.delete(code);
  }
}

export const getSession = (code: string): Session | undefined => {
  sweep();
  return sessions.get(code);
};

/* ---------- opening ---------- */

type Opened = Session | { error: string; status: number };
const inFlight = ((g as { __qafzaOpening?: Map<string, Promise<Opened>> }).__qafzaOpening ??= new Map());

/** two opens of the same code at once (a double click, a page that mounts twice) must end up with one session */
export function openSession(ownerId: string, code: string): Promise<Opened> {
  const key = `${ownerId}:${code}`;
  const pending = inFlight.get(key);
  if (pending) return pending;
  const p = openFresh(ownerId, code).finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

async function openFresh(ownerId: string, code: string): Promise<Opened> {
  const existing = getSession(code);
  if (existing && existing.status === "running") {
    if (existing.ownerId !== ownerId) return { error: "هذه الحصة تخص معلّمًا آخر.", status: 403 };
    // nobody has joined and nothing has started: this is only a lobby that was opened earlier. The teacher may have changed
    // the sharing choices since (groups or individual, the class), so build it again from what is saved now.
    if (existing.students.size === 0 && existing.maxAt === 0) sessions.delete(code);
    else return existing;
  }

  const found = await loadLesson("code", code, ownerId);
  if (!found) return { error: "لم نجد هذا الدرس.", status: 404 };
  if (found.row.status !== "published" || found.row.archived) return { error: "انشر الدرس أولًا.", status: 409 };

  const share = found.share;
  const classes = share.classId ? (await listClasses(ownerId)).filter((c) => c.id === share.classId) : [];
  const cls = classes[0];

  let roster: Session["roster"] = [];
  if (cls && cls.students.length) {
    const count = share.groupCount;
    const dealt = balanceGroups(cls.students as ClassStudent[], count);
    roster = dealt.flatMap((members, group) => members.map((i) => ({ name: cls.students[i].name, group })));
  }

  const s: Session = {
    code,
    lessonId: found.row.id,
    ownerId,
    lesson: found.lesson,
    slides: buildSlides(found.lesson.stations.length),
    share,
    classId: cls?.id ?? null,
    className: cls?.name ?? null,
    at: 0,
    maxAt: 0,
    visited: new Set([0]),
    status: "running",
    students: new Map(),
    flags: {},
    groupBonus: Array(share.groupCount).fill(0),
    roster,
    listeners: new Set(),
    openedAt: Date.now(),
    touched: Date.now(),
    persisted: false,
    pending: null,
  };
  sessions.set(code, s);
  return s;
}

/* ---------- scoring ---------- */

const mode = (s: Session): "groups" | "individual" => (s.share.devices === "board" || s.share.grouping === "groups" ? "groups" : "individual");
const boardOnly = (s: Session) => s.share.devices === "board";

/** points a student has earned so far: only challenges the teacher has revealed count */
function pointsOf(s: Session, st: LStudent): number {
  let p = st.bonus;
  for (const [ci, a] of st.answers) {
    const at = revealIndex(s.slides, ci);
    if (at !== -1 && s.maxAt >= at) p += a.right * POINTS_RIGHT;
  }
  for (const n of st.engaged.values()) p += Math.min(ENGAGE_CAP_PER_STATION, n * POINTS_ENGAGE);
  return p;
}

function groupSizes(s: Session): number[] {
  const sizes = Array(s.share.groupCount).fill(0) as number[];
  if (boardOnly(s)) s.roster.forEach((r) => sizes[r.group]++);
  else for (const st of s.students.values()) if (st.group !== null) sizes[st.group]++;
  return sizes;
}

function currentGroupScores(s: Session) {
  const sums = Array(s.share.groupCount).fill(0) as number[];
  if (boardOnly(s)) {
    for (const [ci, flags] of Object.entries(s.flags)) {
      const r = revealIndex(s.slides, Number(ci));
      if (r === -1 || s.maxAt < r) continue;
      const boss = Number(ci) === s.lesson.stations.length;
      flags.forEach((ok, gi) => ok && (sums[gi] += POINTS_RIGHT * (boss ? 2 : 1)));
    }
  } else for (const st of s.students.values()) if (st.group !== null) sums[st.group] += pointsOf(s, st);
  s.groupBonus.forEach((b, gi) => (sums[gi] += b));
  return groupScores(sums, groupSizes(s));
}

function ranked(s: Session) {
  return [...s.students.values()].map((st) => ({ st, points: pointsOf(s, st) })).sort((a, b) => b.points - a.points || a.st.name.localeCompare(b.st.name, "ar"));
}

const challengeAt = (s: Session) => {
  const sl = s.slides[s.at];
  return sl.kind === "challenge" ? sl.i : null;
};

/* ---------- snapshots ---------- */

export function teacherSnap(s: Session): TeacherSnap {
  const ci = challengeAt(s);
  let distribution: number[] | null = null;
  if (ci !== null && ci < s.lesson.stations.length) {
    const ch = s.lesson.stations[ci].challenge;
    if (ch.kind === "mcq" || ch.kind === "tf") {
      distribution = Array(ch.kind === "mcq" ? 4 : 2).fill(0);
      for (const st of s.students.values()) {
        const a = st.answers.get(ci)?.answer;
        if (a?.kind === "mcq" && ch.kind === "mcq" && a.choice >= 0 && a.choice < 4) distribution[a.choice]++;
        else if (a?.kind === "tf" && ch.kind === "tf") distribution[a.value ? 0 : 1]++;
      }
    }
  }
  const rank = ranked(s);
  return {
    code: s.code,
    status: s.status,
    at: s.at,
    maxAt: s.maxAt,
    slides: s.slides.length,
    mode: mode(s),
    boardOnly: boardOnly(s),
    groupCount: s.share.groupCount,
    className: s.className,
    students: boardOnly(s)
      ? s.roster.map((r, i) => ({ id: `r${i}`, name: r.name, group: r.group, points: 0, online: true, answered: false }))
      : rank.map(({ st, points }) => ({ id: st.id, name: st.name, group: st.group, points, online: st.conns > 0, answered: ci !== null && st.answers.has(ci) })),
    groups: mode(s) === "groups" ? currentGroupScores(s) : [],
    answered: ci === null ? 0 : [...s.students.values()].filter((st) => st.answers.has(ci)).length,
    repeats: [...s.students.values()].filter((st) => st.repeats.has(s.at)).length,
    distribution,
    flags: s.flags,
    top: rank.slice(0, 5).map(({ st, points }) => ({ name: st.name, points })),
    rosterSize: s.roster.length,
  };
}

export function studentSnap(s: Session, sid: string): StudentSnap | null {
  const me = s.students.get(sid);
  if (!me) return null;
  const rank = ranked(s);
  const outcomes: StudentSnap["me"]["outcomes"] = {};
  for (const [ci, a] of me.answers) {
    const r = revealIndex(s.slides, ci);
    if (r !== -1 && s.maxAt >= r) outcomes[ci] = { right: a.right, of: a.of };
  }
  return {
    code: s.code,
    status: s.status,
    at: s.at,
    maxAt: s.maxAt,
    mode: mode(s),
    groupCount: s.share.groupCount,
    me: {
      id: me.id,
      name: me.name,
      group: me.group,
      points: pointsOf(s, me),
      rank: rank.findIndex((r) => r.st.id === me.id) + 1,
      answered: [...me.answers.keys()],
      askedRepeat: me.repeats.has(s.at),
      outcomes,
      engaged: [...me.engaged.values()].reduce((t, n) => t + n, 0),
    },
    groups: mode(s) === "groups" ? currentGroupScores(s) : [],
    top: mode(s) === "individual" ? rank.slice(0, 5).map(({ st, points }) => ({ name: st.name, points, me: st.id === me.id })) : [],
    count: s.students.size,
  };
}

/* ---------- change notification ---------- */

/** many answers arrive in the same instant in a classroom: send one update, not thirty */
export function notify(s: Session) {
  s.touched = Date.now();
  if (s.pending) return;
  s.pending = setTimeout(() => {
    s.pending = null;
    s.listeners.forEach((fn) => fn());
  }, 40);
}

export function subscribe(s: Session, fn: () => void): () => void {
  s.listeners.add(fn);
  return () => s.listeners.delete(fn);
}

export function presence(s: Session, sid: string, delta: 1 | -1) {
  const st = s.students.get(sid);
  if (!st) return;
  st.conns = Math.max(0, st.conns + delta);
  notify(s);
}

/* ---------- students ---------- */

export type JoinOutcome = { ok: true; sid: string; group: number | null; mates: string[] } | { ok: false; error: string; status: number };

export function joinStudent(s: Session, input: { name: string; ref: string; userId: string | null; sid?: string }): JoinOutcome {
  if (s.status === "ended") return { ok: false, error: "انتهت هذه الحصة.", status: 410 };
  if (boardOnly(s)) return { ok: false, error: "هذه حصة على السبورة، ولا تحتاج جهازك.", status: 409 };
  if (s.share.requireLogin && !input.userId) return { ok: false, error: "اشترط معلّمك تسجيل الدخول لهذه الحصة.", status: 403 };

  // the same student coming back (a refresh, a dropped connection) keeps their place and points
  const again = input.sid ? s.students.get(input.sid) : [...s.students.values()].find((x) => x.ref === input.ref);
  if (again && again.ref === input.ref) return { ok: true, sid: again.id, group: again.group, mates: mates(s, again) };

  const name = input.name.trim().replace(/\s+/g, " ").slice(0, 40);
  if (!name) return { ok: false, error: "اكتب اسمك الأول.", status: 400 };
  if ([...s.students.values()].some((x) => x.name === name)) return { ok: false, error: "هذا الاسم مأخوذ في الحصة. أضف حرفًا من اسم العائلة.", status: 409 };
  if (s.students.size >= 200) return { ok: false, error: "امتلأت الحصة.", status: 429 };

  let group: number | null = null;
  if (mode(s) === "groups") {
    const onRoster = s.roster.find((r) => r.name === name);
    if (onRoster) group = onRoster.group;
    else {
      // a new guest goes to the smallest group
      const sizes = groupSizes(s);
      group = sizes.indexOf(Math.min(...sizes));
    }
  }
  const st: LStudent = { id: randomBytes(12).toString("hex"), name, ref: input.ref, userId: input.userId, group, answers: new Map(), engaged: new Map(), repeats: new Set(), bonus: 0, conns: 0 };
  s.students.set(st.id, st);
  notify(s);
  return { ok: true, sid: st.id, group, mates: mates(s, st) };
}

const mates = (s: Session, me: LStudent) => [...s.students.values()].filter((x) => x.id !== me.id && x.group === me.group).map((x) => x.name).slice(0, 8);

export function leave(s: Session, sid: string) {
  s.students.delete(sid);
  notify(s);
}

export type ActResult = { ok: true } | { ok: false; error: string; status: number };

export function answer(s: Session, sid: string, slide: number, a: LiveAnswer): ActResult {
  const st = s.students.get(sid);
  if (!st) return { ok: false, error: "انضم إلى الحصة أولًا.", status: 403 };
  if (s.status === "ended") return { ok: false, error: "انتهت الحصة.", status: 410 };
  const sl = s.slides[slide];
  if (!sl || sl.kind !== "challenge" || slide !== s.at) return { ok: false, error: "هذا التحدي ليس على الشاشة الآن.", status: 409 };
  if (st.answers.has(sl.i)) return { ok: false, error: "أجبت عن هذا التحدي من قبل.", status: 409 };
  const asks = sl.i === s.lesson.stations.length ? "boss" : s.lesson.stations[sl.i].challenge.kind;
  if (a.kind !== asks) return { ok: false, error: "نوع الإجابة لا يناسب هذا التحدي.", status: 400 };
  const j = judge(s.lesson, sl.i, a);
  st.answers.set(sl.i, { answer: a, right: j.right, of: j.of });
  notify(s);
  return { ok: true };
}

export function engage(s: Session, sid: string): ActResult & { engaged?: number } {
  const st = s.students.get(sid);
  if (!st) return { ok: false, error: "انضم إلى الحصة أولًا.", status: 403 };
  const sl = s.slides[s.at];
  if (sl.kind !== "explain") return { ok: false, error: "لا شرح الآن.", status: 409 };
  const n = st.engaged.get(sl.i) ?? 0;
  if (n * POINTS_ENGAGE >= ENGAGE_CAP_PER_STATION) return { ok: true, engaged: n };
  st.engaged.set(sl.i, n + 1);
  notify(s);
  return { ok: true, engaged: n + 1 };
}

export function askRepeat(s: Session, sid: string): ActResult {
  const st = s.students.get(sid);
  if (!st) return { ok: false, error: "انضم إلى الحصة أولًا.", status: 403 };
  if (s.slides[s.at].kind !== "explain") return { ok: false, error: "لا شرح الآن.", status: 409 };
  st.repeats.add(s.at);
  notify(s);
  return { ok: true };
}

/* ---------- the teacher ---------- */

export function goto(s: Session, to: number) {
  if (s.status === "ended") return;
  s.at = Math.max(0, Math.min(s.slides.length - 1, Math.round(to)));
  s.maxAt = Math.max(s.maxAt, s.at);
  s.visited.add(s.at);
  notify(s);
}

/** the teacher has finished the explanation: the "repeat it" requests on screen are cleared */
export function clearRepeats(s: Session) {
  for (const st of s.students.values()) st.repeats.delete(s.at);
  notify(s);
}

/** board-only: mark whether a group answered a challenge right */
export function flag(s: Session, challenge: number, group: number, value: boolean) {
  if (!boardOnly(s) || group < 0 || group >= s.share.groupCount) return;
  const row = s.flags[challenge] ?? (s.flags[challenge] = Array(s.share.groupCount).fill(false));
  row[group] = value;
  notify(s);
}

/** points the teacher hands out in class (+5 or +10) to a student or, with `group`, to a whole group */
export function award(s: Session, target: { student?: string; group?: number }, points: number) {
  const p = points === 10 ? 10 : 5;
  if (target.student) {
    const st = s.students.get(target.student);
    if (st) st.bonus += p;
  } else if (typeof target.group === "number" && target.group >= 0 && target.group < s.share.groupCount) s.groupBonus[target.group] += p;
  notify(s);
}

/** closes the session for everyone at once, then saves the results (the screens already show "ended") */
export async function end(s: Session) {
  if (s.status === "ended") return;
  s.status = "ended";
  notify(s);
  await persist(s);
}

/* ---------- saving the results ---------- */

function bossResults(s: Session, a: Answer | undefined): (0 | 1)[] {
  if (!a || a.answer.kind !== "boss") return s.lesson.boss.map(() => 0);
  const v = a.answer.values;
  return s.lesson.boss.map((b, k) => (v[k] === b.answer ? 1 : 0));
}

async function persist(s: Session) {
  if (s.persisted) return;
  s.persisted = true;
  const total = s.lesson.stations.length;
  const now = Date.now();

  const insert = async (name: string, userId: string | null, ref: string, group: number | null, points: number, results: (0 | 1 | null)[], boss: (0 | 1)[]) => {
    if (s.classId) await enrol(s.classId, name, userId);
    await recordAttempt({
      lessonId: s.lessonId,
      classId: s.classId,
      studentName: name,
      studentUserId: userId,
      studentRef: ref,
      mode: "live",
      groupIdx: group,
      startedAt: s.openedAt,
      finishedAt: now,
      points,
      results,
      boss,
      reached: s.maxAt,
      minutes: Math.max(0, (now - s.openedAt) / 60000),
    });
  };

  if (boardOnly(s)) {
    // the class answered together: every roster student in a group gets that group's marks (an estimate, as the rules say)
    for (const r of s.roster) {
      const results = Array.from({ length: total }, (_, ci) => (s.flags[ci] ? (s.flags[ci][r.group] ? 1 : 0) : null)) as (0 | 1 | null)[];
      const bossOk = s.flags[total]?.[r.group] ? 1 : 0;
      await insert(r.name, null, `roster:${r.name}`, r.group, 0, results, s.lesson.boss.map(() => bossOk as 0 | 1));
    }
    return;
  }

  // a challenge that nobody answered was not really asked (the teacher passed over it): it counts for no one, instead of as a miss for everyone
  const asked = new Set<number>();
  for (const st of s.students.values()) for (const ci of st.answers.keys()) asked.add(ci);

  const scores = currentGroupScores(s);
  const winner = scores.length ? scores.reduce((a, b) => (b.score > a.score ? b : a)).group : null;
  const byGroup = new Map<number, { id: string; points: number }>();
  for (const { st, points } of ranked(s)) if (st.group !== null && !byGroup.has(st.group)) byGroup.set(st.group, { id: st.id, points });

  for (const { st, points } of ranked(s)) {
    const shown = (ci: number) => s.visited.has(s.slides.findIndex((x) => x.kind === "challenge" && x.i === ci));
    const results = Array.from({ length: total }, (_, ci) => (st.answers.has(ci) ? ((st.answers.get(ci)!.right ? 1 : 0) as 0 | 1) : asked.has(ci) && shown(ci) ? 0 : null));
    const boss = bossResults(s, st.answers.get(total));
    await insert(st.name, st.userId, st.ref, st.group, points, results, boss);

    if (!st.userId) continue;
    const right = results.map((r) => r === 1);
    let run = 0, streak = 0;
    for (const ok of right) {
      run = ok ? run + 1 : 0;
      streak = Math.max(streak, run);
    }
    const badges: string[] = [];
    if (streak >= 3) badges.push("blazing");
    if (boss.length && boss.every((b) => b === 1)) badges.push("boss");
    if (right.every(Boolean) && boss.every((b) => b === 1)) badges.push("flawless");
    if (st.group !== null && byGroup.get(st.group)?.id === st.id) badges.push("support");
    if (st.group !== null && winner === st.group) badges.push("spirit");
    await applyAttempt(st.userId, s.lessonId, { points, results, badges: badges.filter((b) => b !== "support" && b !== "spirit"), cards: right.flatMap((ok, i) => (ok ? [i] : [])) });
    await awardBadges(st.userId, badges);
  }
}
