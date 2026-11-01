import { checkVerificationCode, isResponse, requireUser } from "@/lib/server/auth";
import { fail, limited, readJson, text, tooMany } from "@/lib/server/http";

const MESSAGES = {
  wrong: "الرمز غير صحيح. حاول مرة أخرى.",
  expired: "انتهت صلاحية الرمز. اطلب رمزًا جديدًا.",
  locked: "أخطأت مرات كثيرة. اطلب رمزًا جديدًا.",
} as const;

export async function POST(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (limited(`verify:${user.id}`, 12, 60_000 * 10)) return tooMany();
  const b = await readJson(req);
  const code = text(b?.code, 6);
  if (!/^\d{6}$/.test(code)) return fail("اكتب الرمز كاملًا: 6 أرقام.");
  const result = await checkVerificationCode(user.id, code);
  return result === "ok" ? Response.json({ ok: true }) : fail(MESSAGES[result], result === "wrong" ? 400 : 410);
}
