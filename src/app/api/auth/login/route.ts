import { skipVerification } from "@/lib/server/mail";
import { updateUser } from "@/lib/server/users";
import { checkPassword, deliverCode, hashPassword, issueVerificationCode, secondsUntilResend, startSession } from "@/lib/server/auth";
import { clientIp, fail, limited, readJson, text, tooMany } from "@/lib/server/http";
import { getUserByEmail } from "@/lib/server/users";

// a real hash to compare against when the email is unknown, so timing does not reveal which emails exist
const DUMMY = hashPassword("not-a-real-password");

export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b) return fail("طلب غير صالح.");
  const email = text(b.email, 120).toLowerCase();
  const password = typeof b.password === "string" ? b.password : "";
  if (limited(`login:${clientIp(req)}`, 20, 60_000 * 10) || limited(`login:${email}`, 8, 60_000 * 10)) return tooMany();

  const user = await getUserByEmail(email);
  const ok = await checkPassword(password, user?.passwordHash ?? (await DUMMY));
  if (!user || !ok) return fail("البريد أو كلمة المرور غير صحيحة.", 401);
  if (user.status !== "active") return fail("حسابك بانتظار موافقة ولي الأمر.", 403);

  await startSession(user.id);
  if (!user.verified && skipVerification()) {
    await updateUser(user.id, { verified: true });
    return Response.json({ ok: true, verified: true });
  }
  if (user.verified) return Response.json({ ok: true, verified: true });

  // an unverified account gets a fresh code (unless one was just sent)
  const delivered = (await secondsUntilResend(user.id)) > 0 ? {} : await deliverCode(email, user.firstName, await issueVerificationCode(user.id));
  return Response.json({ ok: true, verified: false, ...delivered });
}
