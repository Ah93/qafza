import "server-only";
import type { Challenge } from "../lesson";
import { LessonShapeError, parseChallenge } from "../lesson-schema";
import { AiError, chatJson } from "./deepseek";

const SHAPES: Record<Challenge["kind"], string> = {
  mcq: `{"kind":"mcq","question":"...","options":[{"text":"...","explanation":"لماذا هو خاطئ"},{...},{...},{...}],"correct":0}
4 خيارات بالضبط. الخيارات الخاطئة تعكس أخطاء شائعة حقيقية ولكلٍّ منها شرح. أما الصحيح فاجعل explanation له "". وزّع correct على 0..3.`,
  tf: `{"kind":"tf","statement":"...","answer":true,"explanation":"لماذا هي صحيحة أو خاطئة"}`,
  dnd: `{"kind":"dnd","prompt":"ضع كل بطاقة في مكانها.","slots":[{"label":"اسم الخانة","card":"البطاقة التي تخصها"}, ... 3 بالضبط]}`,
  match: `{"kind":"match","prompt":"طابِق كل عنصر بوصفه.","pairs":[{"term":"...","meaning":"..."}, ... 3 أو 4]}`,
};

/** a new challenge of the wanted kind for one station, built only from that station's own text */
export async function rewriteChallenge(station: { title: string; content: string; keyIdea: string }, kind: Challenge["kind"]): Promise<Challenge> {
  const system = `أنت مصمّم تعليمي خبير. تكتب تحدّيًا واحدًا للمحطة المعطاة من نوع محدّد، وتُخرج JSON صالحًا فقط بلا أي نص خارجه.
القاعدة الذهبية: لا تُولِّد معلومة غير موجودة في نص المحطة. اكتب بلغة النص نفسها.
الشكل المطلوب بالضبط:
${SHAPES[kind]}`;
  const user = `عنوان المحطة: ${station.title}\nالفكرة الأهم: ${station.keyIdea}\nمحتوى المحطة:\n${station.content}`;

  let problem = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const messages = [
      { role: "system" as const, content: system },
      { role: "user" as const, content: user },
      ...(problem ? [{ role: "user" as const, content: `الناتج السابق كان مرفوضًا للسبب التالي، أعد كتابة الـ JSON وصحّحه: ${problem}` }] : []),
    ];
    const raw = await chatJson(messages, { maxTokens: 1500, timeoutMs: 40_000 });
    try {
      return parseChallenge(raw, kind);
    } catch (e) {
      if (!(e instanceof LessonShapeError)) throw e;
      problem = e.message;
    }
  }
  throw new AiError(`challenge validation failed: ${problem}`, "لم نستطع كتابة هذا النوع من التحدّي لهذه المحطة. جرّب نوعًا آخر أو عدّله بيدك.", 422);
}
