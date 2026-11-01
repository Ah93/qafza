import { isResponse, requireUser } from "@/lib/server/auth";
import { fail, readJson, text } from "@/lib/server/http";
import { deleteLesson, loadLesson, ownsLesson, patchLesson, updateLessonData, updateShare } from "@/lib/server/lessons";
import { LessonShapeError } from "@/lib/lesson-schema";

export async function GET(_req: Request, ctx: RouteContext<"/api/lessons/[id]">) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const found = await loadLesson("id", (await ctx.params).id, user.id);
  return found ? Response.json({ lesson: found.lesson, code: found.row.code, status: found.row.status, share: found.share }) : fail("لم نجد هذا الدرس.", 404);
}

/** metadata changes (folder, archive, status), the sharing settings, and full content updates */
export async function PATCH(req: Request, ctx: RouteContext<"/api/lessons/[id]">) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const id = (await ctx.params).id;
  const b = await readJson(req);
  if (!b) return fail("طلب غير صالح.");

  if (!(await ownsLesson(user.id, id))) return fail("لم نجد هذا الدرس.", 404);
  try {
    if (b.lesson !== undefined) await updateLessonData(user.id, id, b.lesson);
  } catch (e) {
    if (e instanceof LessonShapeError) return fail(`الدرس غير مكتمل: ${e.message}`, 422);
    throw e;
  }

  if (b.share !== undefined) await updateShare(user.id, id, b.share);

  const patch: Parameters<typeof patchLesson>[1] = {};
  if ("folder" in b) patch.folder = b.folder === null ? null : text(b.folder, 60) || null;
  if (typeof b.archived === "boolean") patch.archived = b.archived;
  if (b.status === "draft" || b.status === "published") patch.status = b.status;
  if (Object.keys(patch).length) await patchLesson(id, patch);
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/lessons/[id]">) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  return (await deleteLesson(user.id, (await ctx.params).id)) ? Response.json({ ok: true }) : fail("لم نجد هذا الدرس.", 404);
}
