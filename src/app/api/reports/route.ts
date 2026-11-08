import { currentUser } from "@/lib/server/auth";
import { clientIp, fail, limited, readJson, text, tooMany } from "@/lib/server/http";
import { addReport, reportsOfOwner, resolveReport } from "@/lib/server/reports";

/** anyone with the lesson code (a student, or the teacher previewing) can report a mistake */
export async function POST(req: Request) {
  if (limited(`report:${clientIp(req)}`, 10, 60_000)) return tooMany();
  const b = await readJson(req);
  if (!b) return fail("طلب غير صالح.");
  const code = text(b.code, 8).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const part = b.part === "challenge" ? "challenge" : "station";
  const ok = code && (await addReport(code, text(b.stationId, 40), part, text(b.note, 300)));
  return ok ? Response.json({ ok: true }) : fail("لم نجد هذه المحطة.", 404);
}

/** the teacher's own lessons' reports */
export async function GET() {
  const user = await currentUser();
  if (!user) return fail("سجّل الدخول أولًا.", 401);
  return Response.json({ reports: await reportsOfOwner(user.id) }, { headers: { "Cache-Control": "no-store" } });
}

/** the teacher marks a report on their lesson as handled */
export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return fail("سجّل الدخول أولًا.", 401);
  const b = await readJson(req);
  return b && (await resolveReport(text(b.id, 40), user.id)) ? Response.json({ ok: true }) : fail("لم نجد البلاغ.", 404);
}
