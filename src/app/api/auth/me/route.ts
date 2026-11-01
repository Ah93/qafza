import { deleteAccount } from "@/lib/server/account";
import { currentUser, endSession } from "@/lib/server/auth";
import { fail, readJson, text } from "@/lib/server/http";
import { updateUser } from "@/lib/server/users";

export async function GET() {
  const user = await currentUser();
  return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
}

/** the profile fields the account page can change */
export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return fail("سجّل الدخول أولًا.", 401);
  const b = await readJson(req);
  if (!b) return fail("طلب غير صالح.");
  const first = "first" in b ? text(b.first, 40) : user.firstName;
  const last = "last" in b ? text(b.last, 40) : user.lastName;
  if (!first) return fail("اكتب اسمك الأول.");
  await updateUser(user.id, { firstName: first, lastName: last });
  return Response.json({ ok: true });
}

/** delete the account and everything under it */
export async function DELETE() {
  const user = await currentUser();
  if (!user) return fail("سجّل الدخول أولًا.", 401);
  await deleteAccount(user);
  await endSession();
  return Response.json({ ok: true });
}
