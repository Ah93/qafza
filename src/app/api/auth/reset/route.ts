import { hashPassword } from "@/lib/server/auth";
import { clientIp, fail, limited, readJson, tooMany } from "@/lib/server/http";
import { consumeToken, readToken, revokeTokensOf } from "@/lib/server/tokens";
import { getUser, updateUser } from "@/lib/server/users";

/** is this reset link still good? (the page asks before it shows the form) */
export async function GET(req: Request) {
  if (limited(`reset:${clientIp(req)}`, 60, 60_000 * 10)) return tooMany();
  const token = new URL(req.url).searchParams.get("token") ?? "";
  return Response.json({ valid: !!(await readToken("reset", token)) });
}

/** the new password. The link works once; every other outstanding link of the account dies with it. */
export async function POST(req: Request) {
  if (limited(`reset:${clientIp(req)}`, 20, 60_000 * 10)) return tooMany();
  const b = await readJson(req);
  const token = typeof b?.token === "string" ? b.token : "";
  const password = typeof b?.password === "string" ? b.password : "";
  if (password.length < 8 || password.length > 200) return fail("كلمة المرور يجب ألا تقل عن 8 أحرف.");

  const t = await readToken("reset", token);
  if (!t?.userId) return fail("انتهت صلاحية هذا الرابط أو استُخدم من قبل. اطلب رابطًا جديدًا.", 410);
  const user = await getUser(t.userId);
  if (!user || user.status !== "active") return fail("انتهت صلاحية هذا الرابط أو استُخدم من قبل. اطلب رابطًا جديدًا.", 410);

  // opening a link sent to the address proves it belongs to this person, so it also confirms the email
  await updateUser(user.id, { passwordHash: await hashPassword(password), verified: true, sessionsFrom: Date.now() });
  await consumeToken(token);
  await revokeTokensOf(user.id);
  return Response.json({ ok: true });
}
