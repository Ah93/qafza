import { isResponse, requireUser } from "@/lib/server/auth";
import { fail } from "@/lib/server/http";
import { getInvoice } from "@/lib/server/invoices";

export async function GET(_req: Request, ctx: RouteContext<"/api/billing/invoices/[id]">) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const inv = await getInvoice(user.id, (await ctx.params).id);
  return inv ? Response.json({ invoice: inv }, { headers: { "Cache-Control": "no-store" } }) : fail("لم نجد هذه الفاتورة.", 404);
}
