import { isResponse, requireUser } from "@/lib/server/auth";
import { fail } from "@/lib/server/http";
import { PAYWALL_MESSAGE, releaseLessonSlot, reserveLessonSlot } from "@/lib/server/billing";
import { createLesson, loadLesson } from "@/lib/server/lessons";

export async function POST(_req: Request, ctx: RouteContext<"/api/lessons/[id]/copy">) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const found = await loadLesson("id", (await ctx.params).id, user.id);
  if (!found) return fail("لم نجد هذا الدرس.", 404);
  const copy = { ...found.lesson, title: `نسخة من ${found.lesson.title}`.slice(0, 80) };
  if (!(await reserveLessonSlot(user.id))) return Response.json({ error: PAYWALL_MESSAGE }, { status: 402 });
  try {
    return Response.json({ lesson: await createLesson(user.id, copy, found.row.sourceName, "draft") });
  } catch (e) {
    await releaseLessonSlot(user.id);
    throw e;
  }
}
