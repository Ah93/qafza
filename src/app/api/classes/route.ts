import { isResponse, requireUser } from "@/lib/server/auth";
import { cleanGroups, cleanKind, createClass, listClasses } from "@/lib/server/classes";
import { fail, readJson, text } from "@/lib/server/http";

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  return Response.json({ classes: await listClasses(user.id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const b = await readJson(req);
  if (!b) return fail("طلب غير صالح.");

  const name = text(b.name, 60);
  if (!name) return fail("اكتب اسمًا للصف.");
  if ((await listClasses(user.id)).length >= 50) return fail("وصلت إلى الحد الأقصى من الصفوف.", 429);

  const students = Array.isArray(b.students) ? b.students.filter((s): s is string => typeof s === "string").slice(0, 500) : [];
  const id = await createClass(user.id, {
    name,
    kind: cleanKind(b.kind),
    stage: text(b.stage, 30),
    subject: text(b.subject, 40),
    groups: cleanGroups(b.groups),
    requireLogin: b.requireLogin === true,
    students,
    code: b.code as string | undefined,
  });
  const created = (await listClasses(user.id)).find((c) => c.id === id);
  return Response.json({ class: created });
}
