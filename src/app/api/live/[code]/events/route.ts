import { currentUser } from "@/lib/server/auth";
import { getSession, presence, studentSnap, subscribe, teacherSnap } from "@/lib/server/live";

/**
 * Server-sent events: the screen gets the whole (small) state every time anything changes.
 * ?role=teacher (the signed-in owner) or ?role=student&sid=… (the id the join gave back).
 */
export async function GET(req: Request, ctx: RouteContext<"/api/live/[code]/events">) {
  const code = (await ctx.params).code.toUpperCase();
  const url = new URL(req.url);
  const role = url.searchParams.get("role");
  const sid = url.searchParams.get("sid") ?? "";

  const s = getSession(code);
  if (!s) return new Response("no session", { status: 404 });
  if (role === "teacher") {
    const user = await currentUser();
    if (!user || user.id !== s.ownerId) return new Response("forbidden", { status: 403 });
  } else if (role !== "student" || !studentSnap(s, sid)) return new Response("forbidden", { status: 403 });

  const enc = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        const snap = role === "teacher" ? teacherSnap(s) : studentSnap(s, sid);
        if (snap) controller.enqueue(enc.encode(`data: ${JSON.stringify(snap)}\n\n`));
      };
      if (role === "student") presence(s, sid, 1);
      send();
      const unsub = subscribe(s, send);
      const beat = setInterval(() => controller.enqueue(enc.encode(": keep-alive\n\n")), 20_000);

      let closed = false;
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(beat);
        unsub();
        if (role === "student") presence(s, sid, -1);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
