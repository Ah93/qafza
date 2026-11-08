import "server-only";
import type { ClassInfo, ClassKind, ClassStudent } from "../classes";
import { claimCode, lookupCode, releaseCode } from "./codes";
import { alreadyExists, fs, keyId, newId, reassignWhere } from "./firestore";
import { lessonsOfClass } from "./lessons";

const classes = () => fs().collection("classes");
const roster = (classId: string) => classes().doc(classId).collection("students");

type ClassDoc = { userId: string; name: string; kind: ClassKind; stage: string; subject: string; code: string; requireLogin: boolean; groups: number; struggleBelow?: number; createdAt: number };
type StudentDoc = { name: string; userId: string | null; createdAt: number; group?: number | null };
type AttemptDoc = { lessonId: string; studentName: string; studentUserId: string | null; startedAt: number; finishedAt: number | null; results: (0 | 1 | null)[] };

const KINDS: ClassKind[] = ["school", "university", "training", "private"];
const GROUPS = [0, 2, 3, 4] as const;

export const cleanKind = (v: unknown): ClassKind => (KINDS.includes(v as ClassKind) ? (v as ClassKind) : "school");
export const cleanGroups = (v: unknown): ClassInfo["groups"] => (GROUPS.includes(v as 0) ? (v as ClassInfo["groups"]) : 0);

/** mastery of one finished attempt: the share of challenges answered right on the first try */
export function attemptMastery(results: (0 | 1 | null)[]): number | null {
  const r = results.filter((x) => x === 0 || x === 1);
  return r.length ? (r.reduce<number>((t, x) => t + (x ?? 0), 0) / r.length) * 100 : null;
}

async function build(id: string, c: ClassDoc): Promise<ClassInfo> {
  const [students, attemptSnap, lessonRows] = await Promise.all([
    roster(id).get(),
    fs().collection("attempts").where("classId", "==", id).select("lessonId", "studentName", "studentUserId", "startedAt", "finishedAt", "results").get(),
    lessonsOfClass(id),
  ]);
  // the lessons a class is working through: published and not archived
  const inClass = new Set(lessonRows.filter((l) => !l.archived && l.status === "published").map((l) => l.id));
  const attempts = attemptSnap.docs.map((d) => d.data() as AttemptDoc).filter((a) => a.finishedAt).sort((a, b) => a.startedAt - b.startedAt);

  const rows: ClassStudent[] = students.docs
    .map((d) => ({ id: d.id, ...(d.data() as StudentDoc) }))
    .sort((a, b) => a.createdAt - b.createdAt || a.name.localeCompare(b.name, "ar"))
    .map((s) => {
      // only the FIRST finished attempt per lesson counts toward mastery
      const first = new Map<string, number | null>();
      for (const a of attempts) {
        if (!inClass.has(a.lessonId) || first.has(a.lessonId)) continue;
        if ((s.userId && a.studentUserId === s.userId) || a.studentName === s.name) first.set(a.lessonId, attemptMastery(a.results));
      }
      const scores = [...first.values()].filter((v): v is number => v !== null);
      return { id: s.id, name: s.name, registered: !!s.userId, done: first.size, group: typeof s.group === "number" ? s.group : null, mastery: scores.length ? Math.round(scores.reduce((t, v) => t + v, 0) / scores.length) : null };
    });

  return { id, name: c.name, kind: cleanKind(c.kind), stage: c.stage, subject: c.subject, code: c.code, requireLogin: !!c.requireLogin, groups: cleanGroups(c.groups), struggleBelow: c.struggleBelow ?? 60, required: inClass.size, students: rows };
}

export async function listClasses(uid: string): Promise<ClassInfo[]> {
  const snap = await classes().where("userId", "==", uid).get();
  const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ClassDoc) })).sort((a, b) => a.createdAt - b.createdAt);
  return Promise.all(docs.map((d) => build(d.id, d)));
}

export type ClassInput = { name: string; kind: ClassKind; stage: string; subject: string; groups: ClassInfo["groups"]; requireLogin: boolean; students: string[]; code?: string };

export async function createClass(uid: string, c: ClassInput): Promise<string> {
  const id = newId();
  const code = await claimCode("class", id, c.code);
  try {
    await classes().doc(id).set({ userId: uid, name: c.name, kind: c.kind, stage: c.stage, subject: c.subject, code, requireLogin: c.requireLogin, groups: c.groups, createdAt: Date.now() } satisfies ClassDoc);
  } catch (e) {
    await releaseCode(code);
    throw e;
  }
  await addStudents(id, c.students);
  return id;
}

export async function ownsClass(uid: string, id: string): Promise<boolean> {
  const d = await classes().doc(id).get();
  return d.exists && (d.data() as ClassDoc).userId === uid;
}

const cleanName = (n: string) => n.trim().replace(/\s+/g, " ").slice(0, 40);

export async function addStudents(classId: string, names: string[]): Promise<number> {
  const now = Date.now();
  const unique = [...new Set(names.map(cleanName).filter(Boolean))];
  // create() refuses an existing document, which is how a name already on the roster is skipped
  const made = await Promise.all(
    unique.map((name) =>
      roster(classId)
        .doc(keyId(name))
        .create({ name, userId: null, createdAt: now } satisfies StudentDoc)
        .then(() => 1)
        .catch((e) => (alreadyExists(e) ? 0 : Promise.reject(e))),
    ),
  );
  return made.reduce<number>((t, n) => t + n, 0);
}

/**
 * A student enters a class: matched by name to the teacher's roster when the name is on it,
 * otherwise added as a new student. A signed-in student is linked to the row, so results follow them.
 */
export async function enrol(classId: string, name: string, userId: string | null): Promise<{ id: string; created: boolean }> {
  const clean = cleanName(name);
  const ref = roster(classId).doc(keyId(clean));
  try {
    await ref.create({ name: clean, userId, createdAt: Date.now() } satisfies StudentDoc);
    return { id: ref.id, created: true };
  } catch (e) {
    if (!alreadyExists(e)) throw e;
  }
  if (userId) {
    const d = await ref.get();
    if (!(d.data() as StudentDoc).userId) await ref.update({ userId });
  }
  return { id: ref.id, created: false };
}

export async function classByCode(code: string): Promise<{ id: string; name: string; requireLogin: boolean; userId: string } | null> {
  const c = await lookupCode(code);
  if (!c || c.kind !== "class") return null;
  const d = await classes().doc(c.id).get();
  if (!d.exists) return null;
  const data = d.data() as ClassDoc;
  return { id: c.id, name: data.name, requireLogin: !!data.requireLogin, userId: data.userId };
}

export type ClassPatch = { requireLogin?: boolean; groups?: ClassInfo["groups"]; name?: string; kind?: ClassKind; stage?: string; subject?: string; struggleBelow?: number };

export async function updateClass(id: string, patch: ClassPatch) {
  await classes().doc(id).update(patch);
}

/** the teacher puts a student in a group by hand (0-based), or hands them back to the automatic split with null */
export async function setStudentGroup(classId: string, studentId: string, group: number | null): Promise<boolean> {
  const ref = roster(classId).doc(studentId);
  if (!(await ref.get()).exists) return false;
  await ref.update({ group });
  return true;
}

/** every student goes back to the automatic split */
export async function resetStudentGroups(classId: string): Promise<void> {
  const snap = await roster(classId).get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = fs().batch();
    snap.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { group: null }));
    await batch.commit();
  }
}

/** the class, its roster and its code; lessons assigned to it and past attempts stay, but no longer belong to a class */
export async function deleteClass(id: string): Promise<void> {
  const d = await classes().doc(id).get();
  if (!d.exists) return;
  await Promise.all([reassignWhere("lessons", "classId", id, null), reassignWhere("attempts", "classId", id, null), releaseCode((d.data() as ClassDoc).code)]);
  await fs().recursiveDelete(classes().doc(id));
}
