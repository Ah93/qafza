import { isResponse, requireUser } from "@/lib/server/auth";
import { listInvoices } from "@/lib/server/invoices";

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  return Response.json({ invoices: await listInvoices(user.id) }, { headers: { "Cache-Control": "no-store" } });
}
