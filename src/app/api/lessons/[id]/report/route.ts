import { isResponse, requireUser } from "@/lib/server/auth";
import { fail } from "@/lib/server/http";
import { lessonReport } from "@/lib/server/results";

/** how a lesson went: who finished, who is stuck, who never opened it, and which challenges the class missed */
export async function GET(_req: Request, ctx: RouteContext<"/api/lessons/[id]/report">) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const report = await lessonReport(user.id, (await ctx.params).id);
  return report ? Response.json({ report }, { headers: { "Cache-Control": "no-store" } }) : fail("لم نجد هذا الدرس.", 404);
}
