import "server-only";
import { fs, newId } from "./firestore";
import { loadLesson } from "./lessons";

export type Report = {
  id: string;
  lessonId: string;
  lessonTitle: string;
  code: string;
  ownerId: string;
  stationId: string;
  stationTitle: string;
  part: "station" | "challenge";
  note: string;
  status: "open" | "resolved";
  createdAt: number;
};

const col = () => fs().collection("reports");

/** "report an error" on a station or its challenge; the lesson is found by its code so students need no account */
export async function addReport(code: string, stationId: string, part: "station" | "challenge", note: string): Promise<boolean> {
  const found = await loadLesson("code", code);
  const st = found?.lesson.stations.find((s) => s.id === stationId);
  if (!found || !st) return false;
  const id = newId();
  const r: Omit<Report, "id"> = { lessonId: found.row.id, lessonTitle: found.lesson.title, code: found.row.code, ownerId: found.row.userId, stationId, stationTitle: st.title, part, note: note.slice(0, 300), status: "open", createdAt: Date.now() };
  await col().doc(id).set(r);
  return true;
}

const rows = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Report, "id">) })).sort((a, b) => b.createdAt - a.createdAt);

export async function reportsOfOwner(uid: string): Promise<Report[]> {
  return rows((await col().where("ownerId", "==", uid).get()).docs);
}

export async function allReports(limit = 200): Promise<Report[]> {
  return rows((await col().get()).docs).slice(0, limit);
}

export async function resolveReport(id: string, uid: string | null): Promise<boolean> {
  const d = await col().doc(id).get();
  if (!d.exists) return false;
  if (uid && (d.data() as Report).ownerId !== uid) return false;
  await col().doc(id).update({ status: "resolved" });
  return true;
}
