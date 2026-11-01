import { isResponse, requireUser } from "@/lib/server/auth";
import { addStudents, ownsClass } from "@/lib/server/classes";
import { fail, readJson } from "@/lib/server/http";

export async function POST(req: Request, ctx: RouteContext<"/api/classes/[id]/students">) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const id = (await ctx.params).id;
  if (!(await ownsClass(user.id, id))) return fail("لم نجد هذا الصف.", 404);
  const b = await readJson(req);
  const names = Array.isArray(b?.names) ? b.names.filter((s): s is string => typeof s === "string").slice(0, 500) : [];
  if (names.length === 0) return fail("اكتب اسمًا واحدًا على الأقل.");
  return Response.json({ added: await addStudents(id, names) });
}
