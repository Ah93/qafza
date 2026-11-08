import { isResponse, requireUser } from "@/lib/server/auth";
import { cleanGroups, cleanKind, deleteClass, ownsClass, updateClass } from "@/lib/server/classes";
import { fail, readJson, text } from "@/lib/server/http";

export async function PATCH(req: Request, ctx: RouteContext<"/api/classes/[id]">) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const id = (await ctx.params).id;
  if (!(await ownsClass(user.id, id))) return fail("لم نجد هذا الصف.", 404);
  const b = await readJson(req);
  if (!b) return fail("طلب غير صالح.");

  const patch: Parameters<typeof updateClass>[1] = {};
  if (typeof b.requireLogin === "boolean") patch.requireLogin = b.requireLogin;
  if ("groups" in b) patch.groups = cleanGroups(b.groups);
  if (typeof b.name === "string" && text(b.name, 60)) patch.name = text(b.name, 60);
  if ("kind" in b) patch.kind = cleanKind(b.kind);
  if (typeof b.stage === "string") patch.stage = text(b.stage, 30);
  if (typeof b.subject === "string") patch.subject = text(b.subject, 40);
  if (Number.isInteger(b.struggleBelow) && (b.struggleBelow as number) >= 10 && (b.struggleBelow as number) <= 95) patch.struggleBelow = b.struggleBelow as number;
  if (Object.keys(patch).length) await updateClass(id, patch);
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/classes/[id]">) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const id = (await ctx.params).id;
  if (!(await ownsClass(user.id, id))) return fail("لم نجد هذا الصف.", 404);
  await deleteClass(id);
  return Response.json({ ok: true });
}
