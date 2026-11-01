import { CONSENT_DAYS, getConsent, maskEmail, recordSend } from "@/lib/server/consents";
import { clientIp, fail, limited, readJson, text, tooMany } from "@/lib/server/http";
import { MailError, appOrigin, consentMail, devHints, sendMail } from "@/lib/server/mail";
import { issueToken } from "@/lib/server/tokens";

const EMAIL = /^[^\s@/]+@[^\s@/]+\.[^\s@/]{2,}$/;
const MAX_SENDS = 3;

/** the child's page asks where the request stands (the id is what sign-up handed back, kept in this tab only) */
export async function GET(req: Request) {
  if (limited(`consent-read:${clientIp(req)}`, 120, 60_000 * 10)) return tooMany();
  const c = await getConsent(new URL(req.url).searchParams.get("id") ?? "");
  if (!c) return Response.json({ status: "expired" }, { headers: { "Cache-Control": "no-store" } });
  return Response.json({ status: c.status === "deciding" ? "pending" : c.status, parent: c.parentEmail ? maskEmail(c.parentEmail) : null, first: c.first, sends: c.sends }, { headers: { "Cache-Control": "no-store" } });
}

/** the child gives the parent's address: the parent gets a one-time link to agree or refuse */
export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b) return fail("طلب غير صالح.");
  const id = typeof b.id === "string" ? b.id : "";
  const parentEmail = text(b.parentEmail, 120).toLowerCase();
  if (limited(`consent:${clientIp(req)}`, 10, 60_000 * 10)) return tooMany();

  const c = await getConsent(id);
  if (!c) return fail("انتهى هذا الطلب. ابدأ من صفحة التسجيل مجددًا.", 410);
  if (c.status !== "pending") return fail("أُجيب عن هذا الطلب من قبل.", 409);
  if (!EMAIL.test(parentEmail)) return fail("اكتب بريد ولي أمرك كاملًا.");
  if (parentEmail === c.email) return fail("اكتب بريد ولي أمرك، لا بريدك أنت.");
  if (c.sends >= MAX_SENDS) return fail("أرسلنا الطلب إلى ولي أمرك 3 مرات. اطلب منه أن يفتح الرسالة الأخيرة، وتفقّد البريد المزعج.", 429);

  try {
    const raw = await issueToken("consent", { ttlMs: Math.max(60_000, c.expiresAt - Date.now()), ref: c.id });
    const url = `${appOrigin(req)}/parent-consent/review?token=${raw}`;
    await sendMail(consentMail(parentEmail, c.first, url));
    await recordSend(c.id, parentEmail);
    return Response.json({ ok: true, parent: maskEmail(parentEmail), days: CONSENT_DAYS, ...(devHints() ? { devLink: url } : {}) });
  } catch (e) {
    if (e instanceof MailError) return fail(e.message, 503);
    throw e;
  }
}
