import { isResponse, requireUser } from "@/lib/server/auth";
import { createCheckout, getCheckout, provider } from "@/lib/server/billing";
import { fail, limited, readJson, tooMany } from "@/lib/server/http";
import { isCurrency, isMethod, isPlan, methodsFor } from "@/lib/pricing";

/** start a payment: the amount comes from the server's price table, never from the browser */
export async function POST(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (!user.verified) return fail("أكّد بريدك الإلكتروني أولًا.", 403);
  if (limited(`checkout:${user.id}`, 10, 60_000 * 10)) return tooMany();
  const b = await readJson(req);
  if (!b || !isPlan(b.plan) || !isCurrency(b.currency) || !isMethod(b.method)) return fail("طلب غير صالح.");
  if (!methodsFor(b.currency).includes(b.method)) return fail("طريقة الدفع هذه غير متاحة بهذه العملة.");
  if (!provider()) return fail("الدفع غير مفعّل بعد. تواصل معنا لتفعيل اشتراكك.", 503);
  const id = await createCheckout(user.id, b.plan, b.currency, b.method);
  return Response.json({ url: `/pricing/checkout?session=${id}` });
}

/** what the (test) payment window shows */
export async function GET(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const c = await getCheckout(user.id, new URL(req.url).searchParams.get("session") ?? "");
  return c ? Response.json({ checkout: { plan: c.plan, currency: c.currency, method: c.method, amount: c.amount, status: c.status }, test: provider() === "test" }) : fail("لم نجد عملية الدفع.", 404);
}
