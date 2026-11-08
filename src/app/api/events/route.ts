import { currentUser } from "@/lib/server/auth";
import { CLIENT_EVENTS, track, type EventName } from "@/lib/server/events";
import { clientIp, fail, limited, readJson, tooMany } from "@/lib/server/http";

/** the few events only a browser can see (the subscription page opened, its button pressed) */
export async function POST(req: Request) {
  if (limited(`event:${clientIp(req)}`, 60, 60_000)) return tooMany();
  const b = await readJson(req);
  const name = CLIENT_EVENTS.find((e) => e === b?.name) as EventName | undefined;
  if (!name) return fail("حدث غير معروف.");
  const user = await currentUser();
  track(name, { userId: user?.id });
  return Response.json({ ok: true });
}
