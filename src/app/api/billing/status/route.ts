import { isResponse, requireUser } from "@/lib/server/auth";
import { planStatus } from "@/lib/server/billing";

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  return Response.json({ status: await planStatus(user.id) }, { headers: { "Cache-Control": "no-store" } });
}
