import { isResponse, requireUser } from "@/lib/server/auth";
import { isAdmin } from "@/lib/server/events";
import { allReports } from "@/lib/server/reports";

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (!isAdmin(user.email)) return new Response("not found", { status: 404 });
  return Response.json({ reports: await allReports() }, { headers: { "Cache-Control": "no-store" } });
}
