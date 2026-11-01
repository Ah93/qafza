import { isResponse, requireUser } from "@/lib/server/auth";
import { fail, readJson } from "@/lib/server/http";
import { answerReview, dueQuestions } from "@/lib/server/progress";

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  return Response.json({ questions: await dueQuestions(user.id, 3) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const b = await readJson(req);
  if (!b || typeof b.id !== "string" || typeof b.correct !== "boolean") return fail("طلب غير صالح.");
  const r = await answerReview(user.id, b.id, b.correct);
  return r ? Response.json(r) : fail("لم نجد هذا السؤال.", 404);
}
