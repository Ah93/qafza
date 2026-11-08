import { deliverCode, hashPassword, issueVerificationCode, startSession } from "@/lib/server/auth";
import { track } from "@/lib/server/events";
import { skipVerification } from "@/lib/server/mail";
import { updateUser } from "@/lib/server/users";
import { createConsent } from "@/lib/server/consents";
import { clientIp, fail, limited, readJson, text, tooMany } from "@/lib/server/http";
import { createUser, getUserByEmail } from "@/lib/server/users";

const EMAIL = /^[^\s@/]+@[^\s@/]+\.[^\s@/]{2,}$/;

export async function POST(req: Request) {
  if (limited(`signup:${clientIp(req)}`, 8, 60_000 * 10)) return tooMany();
  const b = await readJson(req);
  if (!b) return fail("طلب غير صالح.");

  const first = text(b.first, 40);
  const last = text(b.last, 40);
  const email = text(b.email, 120).toLowerCase();
  const password = typeof b.password === "string" ? b.password : "";
  const role = b.role === "learn" ? "learn" : "teach";
  const birthYear = Number(b.birthYear);
  const thisYear = new Date().getFullYear();
  // the exact age needs the month and day; without them the child is assumed not to have had the birthday yet
  const month = Number(b.birthMonth);
  const day = Number(b.birthDay);
  const known = Number.isInteger(month) && month >= 0 && month <= 11 && Number.isInteger(day) && day >= 1 && day <= 31;
  const now = new Date();
  const hadBirthday = known && (month < now.getMonth() || (month === now.getMonth() && day <= now.getDate()));

  if (!first) return fail("اكتب اسمك الأول.");
  if (!EMAIL.test(email)) return fail("البريد الإلكتروني غير صحيح.");
  if (password.length < 8 || password.length > 200) return fail("كلمة المرور يجب ألا تقل عن 8 أحرف.");
  if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > thisYear) return fail("سنة الميلاد غير صحيحة.");

  const age = thisYear - birthYear - (hadBirthday ? 0 : 1);
  // under 13: no account without a parent's consent, so only a pending request is stored (see consents.ts)
  if (age < 13) {
    if (await getUserByEmail(email)) return fail("هذا البريد مسجّل من قبل. جرّب تسجيل الدخول.", 409);
    const consentId = await createConsent({ first, last, email, passwordHash: await hashPassword(password), role, country: text(b.country, 8) || null, birthYear });
    return Response.json({ needsConsent: true, consentId });
  }

  const id = await createUser({ email, firstName: first, lastName: last, passwordHash: await hashPassword(password), role, country: text(b.country, 8) || null, birthYear });
  if (!id) return fail("هذا البريد مسجّل من قبل. جرّب تسجيل الدخول.", 409);
  track("signup_completed", { userId: id });

  if (skipVerification()) {
    await updateUser(id, { verified: true });
    await startSession(id);
    return Response.json({ ok: true, email, verified: true, role });
  }
  const delivered = await deliverCode(email, first, await issueVerificationCode(id));
  await startSession(id);
  return Response.json({ ok: true, email, ...delivered });
}
