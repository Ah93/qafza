import { isResponse, requireUser } from "@/lib/server/auth";
import { funnel, isAdmin } from "@/lib/server/events";

export async function GET(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  // not even a hint that the page exists for anyone else
  if (!isAdmin(user.email)) return new Response("not found", { status: 404 });
  const days = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 30));
  return Response.json(await funnel(days), { headers: { "Cache-Control": "no-store" } });
}
