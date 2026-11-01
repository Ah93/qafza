import { isResponse, requireUser } from "@/lib/server/auth";
import { peekCode } from "@/lib/server/codes";

/** a code nobody uses yet, shown on the new-class form before the class exists */
export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  return Response.json({ code: await peekCode() }, { headers: { "Cache-Control": "no-store" } });
}
