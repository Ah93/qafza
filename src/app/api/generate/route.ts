import { isResponse, requireUser } from "@/lib/server/auth";
import { PAYWALL_MESSAGE, planStatus } from "@/lib/server/billing";
import { AiError } from "@/lib/server/deepseek";
import { fs, increment } from "@/lib/server/firestore";
import { SourceError, fromFile, fromText, fromUrl, type Extracted } from "@/lib/server/extract";
import { generateLesson } from "@/lib/server/generate";
import { fail, limited, tooMany } from "@/lib/server/http";
import { ASSESSMENT_OPTIONS, AUDIENCES, DEFAULT_CUSTOM, DISPLAY_OPTIONS, GAMIFICATION_OPTIONS, MINUTES, type Customization } from "@/lib/lesson";

export const maxDuration = 120;

const DAILY_LIMIT = 25;

/** only values the UI can produce are accepted: nothing from the client reaches the prompt unchecked */
function customization(raw: FormDataEntryValue | null): Customization {
  try {
    const c = JSON.parse(String(raw ?? "{}")) as Partial<Customization>;
    return {
      audience: AUDIENCES.includes(String(c.audience)) ? String(c.audience) : DEFAULT_CUSTOM.audience,
      minutes: MINUTES.includes(Number(c.minutes)) ? Number(c.minutes) : DEFAULT_CUSTOM.minutes,
      display: DISPLAY_OPTIONS.some((d) => d.id === c.display) ? (c.display as Customization["display"]) : "varied",
      gamification: GAMIFICATION_OPTIONS.some((g) => g.label === c.gamification) ? String(c.gamification) : DEFAULT_CUSTOM.gamification,
      assessment: ASSESSMENT_OPTIONS.some((a) => a.label === c.assessment) ? String(c.assessment) : DEFAULT_CUSTOM.assessment,
    };
  } catch {
    return DEFAULT_CUSTOM;
  }
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (!user.verified) return fail("أكّد بريدك الإلكتروني أولًا.", 403);
  // building costs real money: a free account that already used its lesson is stopped before any work
  if (!(await planStatus(user.id)).canCreate) return fail(PAYWALL_MESSAGE, 402);
  // cheap checks first: source problems should not eat into the (costly) AI allowance
  if (limited(`src:${user.id}`, 40, 60_000)) return tooMany();

  const day = new Date().toISOString().slice(0, 10);
  const usage = fs().collection("usage").doc(`${user.id}_${day}`);
  const used = ((await usage.get()).data() as { generations?: number } | undefined)?.generations ?? 0;
  if (used >= DAILY_LIMIT) return fail("وصلت إلى حدّ البناء اليومي. عُد غدًا.", 429);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("طلب غير صالح.");
  }

  try {
    const type = String(form.get("type") ?? "");
    let ex: Extracted;
    let sourceName = "";
    if (type === "file") {
      const f = form.get("file");
      if (!(f instanceof File) || f.size === 0) return fail("اختر ملفًا أولًا.");
      sourceName = f.name.slice(0, 120);
      ex = await fromFile(f);
    } else if (type === "text") {
      const t = String(form.get("text") ?? "");
      if (t.length > 200_000) return fail("النص طويل جدًا. الصق جزءًا أقصر.");
      sourceName = "نص ملصوق";
      ex = fromText(t);
    } else if (type === "link" || type === "video") {
      const u = String(form.get("url") ?? "").slice(0, 2000);
      sourceName = u.replace(/^https?:\/\//, "").slice(0, 80);
      ex = await fromUrl(u);
    } else return fail("نوع المصدر غير معروف.");

    // the AI allowance: only requests that reached the model count
    if (limited(`gen:${user.id}`, 4, 60_000)) return tooMany();
    const out = await generateLesson(ex, customization(form.get("custom")));

    // counted only when a lesson was really produced
    await usage.set({ userId: user.id, day, generations: increment(1) }, { merge: true });
    return Response.json({ lesson: out.lesson, sourceName, pages: out.pages, truncated: out.truncated });
  } catch (e) {
    if (e instanceof SourceError) return fail(e.message, 422);
    if (e instanceof AiError) {
      console.error("[qafza] generation failed:", e.message);
      return fail(e.userMessage, e.status);
    }
    console.error("[qafza] unexpected generation error:", e);
    return fail("حدث خطأ غير متوقع. حاول مرة أخرى.", 500);
  }
}
