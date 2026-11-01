import { decideConsent } from "@/lib/server/consents";
import { clientIp, fail, limited, readJson, tooMany } from "@/lib/server/http";
import { consumeToken, readToken } from "@/lib/server/tokens";

/** the parent agrees or refuses. The link works once. */
export async function POST(req: Request) {
  if (limited(`consent-decide:${clientIp(req)}`, 20, 60_000 * 10)) return tooMany();
  const b = await readJson(req);
  const token = typeof b?.token === "string" ? b.token : "";
  if (typeof b?.approve !== "boolean") return fail("طلب غير صالح.");

  const t = await readToken("consent", token);
  const status = t?.ref ? await decideConsent(t.ref, b.approve) : null;
  if (!status) return fail("انتهت صلاحية هذا الرابط أو أُجيب عن الطلب من قبل.", 410);
  await consumeToken(token);
  if (status === "failed") return fail("هذا البريد صار مسجّلًا لحساب آخر، فلم يُنشأ الحساب.", 409);
  return Response.json({ ok: true, approved: status === "approved" });
}
