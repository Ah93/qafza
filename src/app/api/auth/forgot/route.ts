import { clientIp, fail, limited, readJson, text, tooMany } from "@/lib/server/http";
import { MailError, appOrigin, devHints, resetMail, sendMail } from "@/lib/server/mail";
import { issueToken, revokeTokensOf } from "@/lib/server/tokens";
import { getUserByEmail } from "@/lib/server/users";

const EMAIL = /^[^\s@/]+@[^\s@/]+\.[^\s@/]{2,}$/;

/**
 * "I forgot my password": emails a one-hour link. The answer is the same whether or not the address has an account,
 * so this cannot be used to find out who is registered.
 */
export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b) return fail("طلب غير صالح.");
  const email = text(b.email, 120).toLowerCase();
  if (!EMAIL.test(email)) return fail("اكتب بريدك الإلكتروني كاملًا.");
  if (limited(`forgot:${clientIp(req)}`, 8, 60_000 * 10) || limited(`forgot:${email}`, 3, 60_000 * 60)) return tooMany();

  const user = await getUserByEmail(email);
  if (!user || user.status !== "active") return Response.json({ ok: true });

  try {
    await revokeTokensOf(user.id);
    const raw = await issueToken("reset", { ttlMs: 60 * 60_000, userId: user.id });
    const url = `${appOrigin(req)}/reset?token=${raw}`;
    await sendMail(resetMail(user.email, user.firstName, url));
    return Response.json({ ok: true, ...(devHints() ? { devLink: url } : {}) });
  } catch (e) {
    if (e instanceof MailError) return fail(e.message, 503);
    throw e;
  }
}
