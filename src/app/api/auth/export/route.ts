import { exportAccount } from "@/lib/server/account";
import { isResponse, requireUser } from "@/lib/server/auth";

/** everything we hold about the signed-in user, as a file they can keep */
export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  return new Response(JSON.stringify(await exportAccount(user), null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="qafza-my-data.json"', "Cache-Control": "no-store" },
  });
}
