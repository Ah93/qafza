import { isResponse, requireUser } from "@/lib/server/auth";
import { track } from "@/lib/server/events";
import { fail, readJson, text } from "@/lib/server/http";
import { PAYWALL_MESSAGE, planStatus, releaseLessonSlot, reserveLessonSlot } from "@/lib/server/billing";
import { createLesson, listLessons } from "@/lib/server/lessons";
import { LessonShapeError } from "@/lib/lesson-schema";

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  return Response.json({ lessons: await listLessons(user.id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const b = await readJson(req);
  if (!b) return fail("طلب غير صالح.");
  if (!(await reserveLessonSlot(user.id))) return fail(PAYWALL_MESSAGE, 402);
  try {
    const made = await createLesson(user.id, b.lesson, text(b.sourceName, 120), b.status === "draft" ? "draft" : "published");
    if ((await planStatus(user.id)).lessonsCreated === 2) track("second_lesson_started", { userId: user.id });
    return Response.json({ lesson: made });
  } catch (e) {
    await releaseLessonSlot(user.id);
    if (e instanceof LessonShapeError) return fail(`الدرس غير مكتمل: ${e.message}`, 422);
    throw e;
  }
}
