import { currentUser } from "@/lib/server/auth";
import { cleanInput, saveAttempt } from "@/lib/server/attempts";
import { fs } from "@/lib/server/firestore";
import { clientIp, fail, limited, readJson, tooMany } from "@/lib/server/http";
import { loadLesson } from "@/lib/server/lessons";

/**
 * A student's progress through a lesson. Open to guests (the lesson code is the key), so the checks
 * that matter happen inside saveAttempt: the lesson must be published, sign-in is enforced when the teacher asked.
 */
export async function POST(req: Request) {
  if (limited(`attempt:${clientIp(req)}`, 240, 60_000)) return tooMany();
  const b = await readJson(req);
  const input = b && cleanInput(b);
  if (!input) return fail("بيانات المحاولة غير مكتملة.");
  const r = await saveAttempt(await currentUser(), input);
  return r.ok ? Response.json({ id: r.id, finished: r.finished }) : Response.json({ error: r.error, needsLogin: r.needsLogin }, { status: r.status });
}

/** the unfinished attempt this device has at a lesson, so a student who left can continue where they stopped */
export async function GET(req: Request) {
  if (limited(`attemptget:${clientIp(req)}`, 120, 60_000)) return tooMany();
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? "").toUpperCase();
  const ref = url.searchParams.get("ref") ?? "";
  if (!/^[A-Z0-9]{4}$/.test(code) || ref.length < 8) return fail("طلب غير صالح.");
  const found = await loadLesson("code", code);
  if (!found) return fail("لا نعرف هذا الرمز.", 404);

  const snap = await fs().collection("attempts").where("studentRef", "==", ref).get();
  const open = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as { lessonId: string; mode: string; finishedAt: number | null; startedAt: number; results: (0 | 1 | null)[]; points: number; reached: number; minutes: number }) }))
    .filter((a) => a.lessonId === found.row.id && a.mode === "self" && !a.finishedAt)
    .sort((a, b) => b.startedAt - a.startedAt)[0];
  return Response.json({ attempt: open ? { id: open.id, results: open.results, points: open.points, reached: open.reached, minutes: open.minutes } : null });
}
