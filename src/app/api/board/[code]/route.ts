import { fs } from "@/lib/server/firestore";
import { clientIp, fail, limited, tooMany } from "@/lib/server/http";
import { loadLesson } from "@/lib/server/lessons";

/**
 * The leaderboard of a lesson played on students' own time: each student's best finished score.
 * Public like the lesson itself (the code is the key), and it shows first names of the top five only:
 * the rules say the last places are never shown to the class. `scores` has everyone's points, no names, so a student can find their own rank.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/board/[code]">) {
  if (limited(`board:${clientIp(req)}`, 60, 60_000)) return tooMany();
  const found = await loadLesson("code", (await ctx.params).code.toUpperCase());
  if (!found || found.row.archived || found.row.status !== "published") return fail("لا نعرف هذا الرمز.", 404);

  const snap = await fs().collection("attempts").where("lessonId", "==", found.row.id).select("studentName", "studentRef", "points", "finishedAt", "mode").get();
  const best = new Map<string, { name: string; points: number }>();
  for (const d of snap.docs) {
    const a = d.data() as { studentName: string; studentRef: string; points: number; finishedAt: number | null; mode: string };
    if (!a.finishedAt || a.mode !== "self") continue;
    const cur = best.get(a.studentRef);
    if (!cur || a.points > cur.points) best.set(a.studentRef, { name: a.studentName, points: a.points });
  }
  const all = [...best.values()].sort((x, y) => y.points - x.points);
  return Response.json({ top: all.slice(0, 5), scores: all.map((a) => a.points) }, { headers: { "Cache-Control": "no-store" } });
}
