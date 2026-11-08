import "server-only";
import { sanitizeShare, type Lesson, type LessonSummary, type ShareConfig } from "../lesson";
import { EDITED_LESSON, parseLesson } from "../lesson-schema";
import { claimCode, lookupCode, releaseCode } from "./codes";
import { deleteWhere, fs, newId } from "./firestore";

const lessons = () => fs().collection("lessons");

/** a lesson's bookkeeping fields (the lesson body itself is loaded separately) */
export type LessonRecord = {
  id: string;
  userId: string;
  code: string;
  title: string;
  sourceName: string;
  status: "draft" | "published";
  folder: string | null;
  archived: boolean;
  classId: string | null;
  createdAt: number;
  updatedAt: number;
};

type Doc = Omit<LessonRecord, "id"> & { data: string; share: Partial<ShareConfig>; sourcePages?: string };

const record = (id: string, d: Doc): LessonRecord => ({
  id,
  userId: d.userId,
  code: d.code,
  title: d.title,
  sourceName: d.sourceName,
  status: d.status,
  folder: d.folder ?? null,
  archived: !!d.archived,
  classId: d.classId ?? null,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

export const summary = (r: LessonRecord): LessonSummary => ({
  id: r.id,
  code: r.code,
  title: r.title,
  sourceName: r.sourceName,
  status: r.status,
  folder: r.folder,
  archived: r.archived,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

const LIST_FIELDS = ["userId", "code", "title", "sourceName", "status", "folder", "archived", "classId", "createdAt", "updatedAt"] as const;

/** the lessons of one teacher, newest first (the heavy `data` field is left out of lists) */
export async function listLessons(uid: string): Promise<LessonSummary[]> {
  const snap = await lessons().where("userId", "==", uid).select(...LIST_FIELDS).get();
  return snap.docs.map((d) => summary(record(d.id, d.data() as Doc))).sort((a, b) => b.updatedAt - a.updatedAt);
}

/** throws LessonShapeError when the lesson is structurally broken */
export async function createLesson(uid: string, raw: unknown, sourceName: string, status: "draft" | "published" = "published", sourceId = ""): Promise<LessonSummary> {
  const lesson = parseLesson(raw, EDITED_LESSON);
  const id = newId();
  const code = await claimCode("lesson", id);
  const now = Date.now();
  let sourcePages: string | undefined;
  if (sourceId) {
    const sd = await fs().collection("sources").doc(sourceId).get();
    const sdata = sd.data() as { userId: string; pages: string } | undefined;
    if (sdata && sdata.userId === uid) sourcePages = sdata.pages;
  }
  const doc: Doc = { userId: uid, code, title: lesson.title, data: JSON.stringify(lesson), sourceName: sourceName.slice(0, 120), status, folder: null, archived: false, classId: null, share: {}, createdAt: now, updatedAt: now, ...(sourcePages ? { sourcePages } : {}) };
  try {
    await lessons().doc(id).set(doc);
    if (sourcePages) await fs().collection("sources").doc(sourceId).delete().catch(() => undefined);
  } catch (e) {
    await releaseCode(code);
    throw e;
  }
  return summary(record(id, doc));
}

export async function updateLessonData(uid: string, id: string, raw: unknown): Promise<boolean> {
  const lesson = parseLesson(raw, EDITED_LESSON);
  const ref = lessons().doc(id);
  const d = await ref.get();
  if (!d.exists || (d.data() as Doc).userId !== uid) return false;
  await ref.update({ data: JSON.stringify(lesson), title: lesson.title, updatedAt: Date.now() });
  return true;
}

export async function updateShare(uid: string, id: string, raw: unknown): Promise<void> {
  const share = sanitizeShare(raw);
  // a lesson can only be assigned to one of the teacher's own classes
  if (share.classId) {
    const c = await fs().collection("classes").doc(share.classId).get();
    if (!c.exists || (c.data() as { userId: string }).userId !== uid) share.classId = null;
  }
  await lessons().doc(id).update({ share, classId: share.classId, updatedAt: Date.now() });
}

export type Loaded = { row: LessonRecord; lesson: Lesson; share: ShareConfig };

export async function loadLesson(by: "id" | "code", value: string, uid?: string): Promise<Loaded | null> {
  let id = value;
  if (by === "code") {
    const c = await lookupCode(value);
    if (!c || c.kind !== "lesson") return null;
    id = c.id;
  }
  const d = await lessons().doc(id).get();
  if (!d.exists) return null;
  const data = d.data() as Doc;
  if (uid && data.userId !== uid) return null;
  try {
    return { row: record(id, data), lesson: parseLesson(JSON.parse(data.data), EDITED_LESSON), share: sanitizeShare(data.share) };
  } catch {
    return null;
  }
}

/** folder, archive and publish state */
export async function patchLesson(id: string, patch: { folder?: string | null; archived?: boolean; status?: "draft" | "published" }): Promise<void> {
  await lessons().doc(id).update({ ...patch, updatedAt: Date.now() });
}

export async function ownsLesson(uid: string, id: string): Promise<boolean> {
  const d = await lessons().doc(id).get();
  return d.exists && (d.data() as Doc).userId === uid;
}

/** the lesson, its code, and everything that hangs off it: students' attempts and review questions */
export async function deleteLesson(uid: string, id: string): Promise<boolean> {
  const d = await lessons().doc(id).get();
  if (!d.exists || (d.data() as Doc).userId !== uid) return false;
  await Promise.all([deleteWhere("attempts", "lessonId", id), deleteWhere("mistakes", "lessonId", id), releaseCode((d.data() as Doc).code)]);
  await lessons().doc(id).delete();
  return true;
}

export async function lessonsOfClass(classId: string): Promise<LessonRecord[]> {
  const snap = await lessons().where("classId", "==", classId).select(...LIST_FIELDS).get();
  return snap.docs.map((d) => record(d.id, d.data() as Doc));
}

/** the lesson's bookkeeping only (no body): cheap, for checks that do not need the content */
export async function lessonRecord(id: string): Promise<LessonRecord | null> {
  const [d] = await fs().getAll(lessons().doc(id), { fieldMask: [...LIST_FIELDS] });
  return d.exists ? record(id, d.data() as Doc) : null;
}

/** the original pages a lesson was built from (kept apart from the lesson body); null when none were kept */
export async function loadSourcePages(by: "id" | "code", value: string, uid?: string): Promise<{ title: string; pages: { n: number; text: string }[] } | null> {
  let id = value;
  if (by === "code") {
    const c = await lookupCode(value);
    if (!c || c.kind !== "lesson") return null;
    id = c.id;
  }
  const d = await lessons().doc(id).get();
  if (!d.exists) return null;
  const data = d.data() as Doc;
  if (uid && data.userId !== uid) return null;
  if (!data.sourcePages) return null;
  try {
    return { title: data.sourceName, pages: JSON.parse(data.sourcePages) };
  } catch {
    return null;
  }
}
