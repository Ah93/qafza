import { isResponse, requireUser } from "@/lib/server/auth";
import { finishTestCheckout, provider } from "@/lib/server/billing";
import { fail, readJson } from "@/lib/server/http";

/** the test provider's pay / cancel buttons. Refuses to exist unless the test provider is on (never in production). */
export async function POST(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (provider() !== "test") return fail("غير متاح.", 404);
  const b = await readJson(req);
  if (!b || typeof b.session !== "string" || typeof b.paid !== "boolean") return fail("طلب غير صالح.");
  const r = await finishTestCheckout(user.id, b.session, b.paid);
  return r === "ok" ? Response.json({ ok: true }) : fail(r === "used" ? "استُخدمت عملية الدفع هذه من قبل." : "انتهت عملية الدفع.", 410);
}
