import { currentUser } from "@/lib/server/auth";
import { classByCode, enrol } from "@/lib/server/classes";
import { fs } from "@/lib/server/firestore";
import { clientIp, fail, limited, readJson, text, tooMany } from "@/lib/server/http";
import { loadLesson } from "@/lib/server/lessons";
import { lookupCode } from "@/lib/server/codes";
import { getUser } from "@/lib/server/users";

const UNKNOWN = "لا نعرف هذا الرمز. تأكد منه مع معلّمك.";

/**
 * Public on purpose: a student with a code needs no account. The code may be a lesson's or a class's.
 * Only published, un-archived lessons are reachable, and a teacher who requires sign-in is obeyed here, on the server.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/join/[code]">) {
  if (limited(`join:${clientIp(req)}`, 60, 60_000)) return tooMany();
  const code = (await ctx.params).code.toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(code)) return fail(UNKNOWN, 404);
  const user = await currentUser();

  const entry = await lookupCode(code);
  if (!entry) return fail(UNKNOWN, 404);

  if (entry.kind === "lesson") {
    const found = await loadLesson("code", code);
    if (!found || found.row.archived || found.row.status !== "published") return fail(UNKNOWN, 404);
    if (found.share.requireLogin && !user) return Response.json({ error: "اشترط معلّمك تسجيل الدخول لهذا الدرس.", needsLogin: true }, { status: 403 });

    const [teacher, cls] = await Promise.all([getUser(found.row.userId), found.row.classId ? fs().collection("classes").doc(found.row.classId).get() : null]);
    const c = cls?.exists ? (cls.data() as { name: string; requireLogin?: boolean }) : null;
    if (c?.requireLogin && !user) return Response.json({ error: "هذا الصف يشترط تسجيل الدخول.", needsLogin: true }, { status: 403 });
    return Response.json({ kind: "lesson", lesson: found.lesson, share: found.share, code, teacher: teacher?.firstName ?? "", className: c?.name ?? null }, { headers: { "Cache-Control": "no-store" } });
  }

  const cls = await classByCode(code);
  if (!cls) return fail(UNKNOWN, 404);
  if (cls.requireLogin && !user) return Response.json({ error: "هذا الصف يشترط تسجيل الدخول.", needsLogin: true }, { status: 403 });
  const snap = await fs().collection("lessons").where("classId", "==", cls.id).select("code", "title", "archived", "status", "updatedAt").get();
  const lessons = snap.docs
    .map((d) => d.data() as { code: string; title: string; archived: boolean; status: string; updatedAt: number })
    .filter((l) => !l.archived && l.status === "published")
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((l) => ({ code: l.code, title: l.title }));
  return Response.json({ kind: "class", className: cls.name, lessons }, { headers: { "Cache-Control": "no-store" } });
}

/** a student enters a class with its permanent code: matched to the roster by name, or added */
export async function POST(req: Request, ctx: RouteContext<"/api/join/[code]">) {
  if (limited(`joinclass:${clientIp(req)}`, 40, 60_000)) return tooMany();
  const code = (await ctx.params).code.toUpperCase();
  const cls = await classByCode(code);
  if (!cls) return fail(UNKNOWN, 404);
  const user = await currentUser();
  if (cls.requireLogin && !user) return Response.json({ error: "هذا الصف يشترط تسجيل الدخول.", needsLogin: true }, { status: 403 });
  const b = await readJson(req);
  const name = text(b?.name, 40) || user?.firstName || "";
  if (!name) return fail("اكتب اسمك الأول.");
  const r = await enrol(cls.id, name, user?.id ?? null);
  return Response.json({ ok: true, created: r.created, className: cls.name });
}
