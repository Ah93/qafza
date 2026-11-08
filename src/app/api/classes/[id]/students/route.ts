import { isResponse, requireUser } from "@/lib/server/auth";
import { addStudents, ownsClass, resetStudentGroups, setStudentGroup } from "@/lib/server/classes";
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

/** put one student in a group by hand ({ student, group: 0..3 }), hand one back ({ student, group: null }), or reset all ({ reset: true }) */
export async function PATCH(req: Request, ctx: RouteContext<"/api/classes/[id]/students">) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const id = (await ctx.params).id;
  if (!(await ownsClass(user.id, id))) return fail("لم نجد هذا الصف.", 404);
  const b = await readJson(req);
  if (!b) return fail("طلب غير صالح.");
  if (b.reset === true) {
    await resetStudentGroups(id);
    return Response.json({ ok: true });
  }
  const group = b.group === null ? null : Number.isInteger(b.group) && (b.group as number) >= 0 && (b.group as number) <= 3 ? (b.group as number) : undefined;
  if (typeof b.student !== "string" || group === undefined) return fail("طلب غير صالح.");
  return (await setStudentGroup(id, b.student, group)) ? Response.json({ ok: true }) : fail("لم نجد هذا الطالب.", 404);
}
