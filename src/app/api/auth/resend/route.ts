import { deliverCode, isResponse, issueVerificationCode, requireUser, secondsUntilResend } from "@/lib/server/auth";

export async function POST() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (user.verified) return Response.json({ ok: true, verified: true });
  const wait = await secondsUntilResend(user.id);
  if (wait > 0) return Response.json({ error: `انتظر ${wait} ثانية قبل طلب رمز جديد.`, wait }, { status: 429 });
  const sent = await deliverCode(user.email, user.firstName, await issueVerificationCode(user.id));
  return sent.mailError ? Response.json({ error: sent.mailError }, { status: 503 }) : Response.json({ ok: true, wait: 45, ...sent });
}
