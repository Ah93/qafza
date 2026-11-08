import { isResponse, requireUser } from "@/lib/server/auth";
import { rewriteChallenge } from "@/lib/server/challenge";
import { AiError } from "@/lib/server/deepseek";
import { fail, limited, readJson, text, tooMany } from "@/lib/server/http";

export const maxDuration = 120;

const KINDS = ["mcq", "tf", "dnd", "match"] as const;

/** the teacher wants another kind of challenge for a station: write one from the station's own content */
export async function POST(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (limited(`challenge:${user.id}`, 10, 60_000)) return tooMany();
  const b = await readJson(req);
  const kind = KINDS.find((k) => k === b?.kind);
  const content = text(b?.content, 2000);
  if (!b || !kind || !content) return fail("طلب غير صالح.");
  try {
    const challenge = await rewriteChallenge({ title: text(b.title, 120), content, keyIdea: text(b.keyIdea, 300) }, kind);
    return Response.json({ challenge });
  } catch (e) {
    if (e instanceof AiError) {
      console.error("[qafza] challenge rewrite failed:", e.message);
      return fail(e.userMessage, e.status);
    }
    throw e;
  }
}
