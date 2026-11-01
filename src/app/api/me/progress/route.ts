import { isResponse, requireUser } from "@/lib/server/auth";
import { getProgress } from "@/lib/server/progress";

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  return Response.json({ progress: await getProgress(user.id) }, { headers: { "Cache-Control": "no-store" } });
}
