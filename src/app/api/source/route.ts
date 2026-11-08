import { currentUser } from "@/lib/server/auth";
import { clientIp, fail, limited, tooMany } from "@/lib/server/http";
import { loadSourcePages } from "@/lib/server/lessons";
import { bestSentence, splitSentences } from "@/lib/source-match";

/**
 * The original passage behind a station: the page, split into sentences, with the sentence the station
 * came from marked. A student reaches it with the lesson code; the owner can also use the lesson id.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  if (limited(`source:${clientIp(req)}`, 60, 60_000)) return tooMany();
  const page = Math.max(1, Math.round(Number(q.get("page")) || 1));
  const query = (q.get("q") ?? "").slice(0, 600);
  const id = q.get("id");
  let src;
  if (id) {
    const user = await currentUser();
    if (!user) return fail("سجّل الدخول أولًا.", 401);
    src = await loadSourcePages("id", id, user.id);
  } else {
    const code = (q.get("code") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    src = code ? await loadSourcePages("code", code) : null;
  }
  if (!src) return fail("المقطع الأصلي غير محفوظ لهذا الدرس.", 404);
  const at = src.pages.findIndex((p) => p.n === page);
  if (at < 0) return fail("هذه الصفحة غير موجودة في المصدر.", 404);
  const sentences = splitSentences(src.pages[at].text);
  return Response.json(
    {
      source: src.title,
      page,
      pages: src.pages.length,
      sentences,
      hit: bestSentence(sentences, query),
      prev: src.pages[at - 1] ? splitSentences(src.pages[at - 1].text).slice(-1)[0] ?? "" : "",
      next: src.pages[at + 1] ? splitSentences(src.pages[at + 1].text)[0] ?? "" : "",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
