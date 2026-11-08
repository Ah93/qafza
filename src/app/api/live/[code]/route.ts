import { currentUser } from "@/lib/server/auth";
import { clientIp, fail, limited, readJson, text, tooMany } from "@/lib/server/http";
import { answer, askRepeat, award, clearRepeats, end, engage, flag, getSession, goto, joinStudent, leave, notify, openSession, teacherSnap } from "@/lib/server/live";
import type { LiveAnswer } from "@/lib/live-flow";

/** the answer a student sends, reduced to the plain shapes the judge understands */
function cleanAnswer(v: unknown): LiveAnswer | null {
  if (!v || typeof v !== "object") return null;
  const a = v as Record<string, unknown>;
  if (a.kind === "mcq" && Number.isInteger(a.choice)) return { kind: "mcq", choice: a.choice as number };
  if (a.kind === "tf" && typeof a.value === "boolean") return { kind: "tf", value: a.value };
  if (a.kind === "dnd" && Array.isArray(a.placed) && a.placed.length <= 8) return { kind: "dnd", placed: a.placed.map((x) => String(x).slice(0, 80)) };
  if (a.kind === "match" && Array.isArray(a.links) && a.links.length <= 8) return { kind: "match", links: a.links.map((x) => Number(x)) };
  if (a.kind === "boss" && Array.isArray(a.values) && a.values.length <= 8) return { kind: "boss", values: a.values.map((x) => x === true) };
  return null;
}

/** one door for everything: the teacher's controls and the students' actions */
export async function POST(req: Request, ctx: RouteContext<"/api/live/[code]">) {
  const code = (await ctx.params).code.toUpperCase();
  const b = await readJson(req);
  if (!b) return fail("طلب غير صالح.");
  const action = String(b.action ?? "");
  const user = await currentUser();

  /* ---- teacher ---- */
  if (action === "open") {
    if (!user) return fail("سجّل الدخول أولًا.", 401);
    const s = await openSession(user.id, code);
    return "error" in s ? fail(s.error, s.status) : Response.json({ snap: teacherSnap(s) });
  }
  if (["goto", "end", "flag", "award", "clearRepeats"].includes(action)) {
    if (!user) return fail("سجّل الدخول أولًا.", 401);
    const s = getSession(code);
    if (!s || s.ownerId !== user.id) return fail("لا حصة مفتوحة بهذا الرمز.", 404);
    if (action === "goto") goto(s, Number(b.at));
    else if (action === "end") await end(s);
    else if (action === "clearRepeats") clearRepeats(s);
    else if (action === "flag") flag(s, Number(b.challenge), Number(b.group), b.value === true);
    else award(s, { student: typeof b.student === "string" ? b.student : undefined, group: Number.isInteger(b.group) ? (b.group as number) : undefined }, Number(b.points));
    return Response.json({ snap: teacherSnap(s) });
  }

  /* ---- students ---- */
  const s = getSession(code);
  if (action === "join") {
    if (limited(`livejoin:${clientIp(req)}`, 120, 60_000)) return tooMany();
    if (!s || s.status === "ended") return Response.json({ error: "لم يفتح المعلّم الحصة بعد. انتظر قليلًا.", notOpen: true }, { status: 409 });
    const ref = text(b.ref, 64);
    if (ref.length < 8) return fail("طلب غير صالح.");
    const r = joinStudent(s, { name: text(b.name, 40), ref, userId: user?.id ?? null, sid: typeof b.sid === "string" ? b.sid : undefined });
    return r.ok ? Response.json({ sid: r.sid, group: r.group, mates: r.mates, mode: s.share.grouping, groupCount: s.share.groupCount }) : Response.json({ error: r.error, needsLogin: r.status === 403 }, { status: r.status });
  }

  const sid = text(b.sid, 64);
  if (!s) return fail("لا حصة مفتوحة بهذا الرمز.", 404);
  if (limited(`live:${sid || clientIp(req)}`, 180, 60_000)) return tooMany();

  if (action === "answer") {
    const a = cleanAnswer(b.answer);
    if (!a) return fail("إجابة غير صالحة.");
    const r = answer(s, sid, Number(b.slide), a);
    return r.ok ? Response.json({ ok: true }) : fail(r.error, r.status);
  }
  if (action === "engage") {
    const r = engage(s, sid);
    return r.ok ? Response.json({ ok: true, engaged: r.engaged }) : fail(r.error, r.status);
  }
  if (action === "repeat") {
    const r = askRepeat(s, sid);
    return r.ok ? Response.json({ ok: true }) : fail(r.error, r.status);
  }
  if (action === "leave") {
    leave(s, sid);
    return Response.json({ ok: true });
  }
  if (action === "ping") {
    notify(s);
    return Response.json({ ok: true });
  }
  return fail("إجراء غير معروف.");
}
