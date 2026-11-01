import { getConsent } from "@/lib/server/consents";
import { clientIp, limited, tooMany } from "@/lib/server/http";
import { readToken } from "@/lib/server/tokens";

/** the parent's page: whose request is this, and is the link still good? Nothing else about the child is revealed. */
export async function GET(req: Request) {
  if (limited(`consent-review:${clientIp(req)}`, 60, 60_000 * 10)) return tooMany();
  const t = await readToken("consent", new URL(req.url).searchParams.get("token") ?? "");
  const c = t?.ref ? await getConsent(t.ref) : null;
  if (!c || c.status !== "pending") return Response.json({ valid: false }, { headers: { "Cache-Control": "no-store" } });
  return Response.json({ valid: true, first: c.first }, { headers: { "Cache-Control": "no-store" } });
}
