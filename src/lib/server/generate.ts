import "server-only";
import type { Challenge, Customization, Lesson, ModeId } from "../lesson";
import { LessonShapeError, STATION_COUNT, parseLesson, type Constraints } from "../lesson-schema";
import { AiError, chatJson } from "./deepseek";
import { fit, type Extracted } from "./extract";

const KINDS: Record<string, Challenge["kind"][]> = {
  "اختيار من متعدد، صح أو خطأ، سحب وإفلات، مطابقة": ["mcq", "tf", "dnd", "match"],
  "اختيار من متعدد وصح أو خطأ": ["mcq", "tf"],
  "سحب وإفلات ومطابقة": ["dnd", "match"],
};

export function constraintsFor(c: Customization, pageCount: number): Constraints {
  return {
    forcedMode: c.display === "varied" ? null : (c.display as ModeId),
    allowedKinds: KINDS[c.assessment] ?? ["mcq", "tf", "dnd", "match"],
    pageCount,
  };
}

const SYSTEM = `أنت مصمّم تعليمي خبير. تحوّل نصًّا يقدّمه المعلّم إلى درس تفاعلي ملعوب، وتُخرج JSON صالحًا فقط بلا أي نص خارجه.

القاعدة الذهبية: لا تُولِّد معلومة غير موجودة في النص المقدَّم. كل محطة وكل تحدٍّ يجب أن يعتمد على جزء فعلي من النص. إن كان نص ما غامضًا أو ناقصًا أو متناقضًا فاكتب في الحقل "review" جملة تشرح للمعلّم ما يحتاج تدقيقه، وإلا فاجعله null.
اكتب بلغة النص نفسها (العربية إن كان النص عربيًا). لا تذكر أنك ذكاء اصطناعي.

الشكل المطلوب بالضبط:
{
  "title": "عنوان الدرس القصير",
  "stations": [  // ${STATION_COUNT} محطات بالضبط، كل محطة هدف تعلّم واحد
    {
      "title": "عنوان المحطة",
      "mode": "slides" | "infographic" | "timeline" | "dialogue" | "cards" | "diagram",
      "page": 1,   // رقم الصفحة [صفحة N] التي أُخذ منها محتوى المحطة، ويجب أن يكون موجودًا في النص
      "content": "سطر مقدمة قصير يشرح الفكرة\\n▪ عنوان: شرح قصير\\n▪ عنوان: شرح قصير\\n▪ عنوان: شرح قصير",
      "keyIdea": "الفكرة الأهم في جملة واحدة",
      "review": null,
      "challenge": { ... واحد من الأنواع أدناه ... }
    }
  ],
  "boss": [ {"statement": "عبارة", "answer": true}, ... ]  // 4 عبارات صح أو خطأ تختبر الدرس كله، فيها صحيح وخاطئ
}

أنواع التحدي (اختر لكل محطة نوعًا من المسموح فقط، ونوّع بينها):
- {"kind":"mcq","question":"...","options":[{"text":"...","explanation":"..."},{...},{...},{...}],"correct":0}
  4 خيارات بالضبط. الخيارات الخاطئة تعكس أخطاء شائعة حقيقية، ولكلٍّ منها "explanation" يشرح لماذا هو خاطئ. أما الخيار الصحيح فاجعل explanation له "".
  وزّع موضع الإجابة الصحيحة (correct) على 0..3 ولا تجعله دائمًا نفسه.
- {"kind":"tf","statement":"...","answer":true,"explanation":"لماذا هي صحيحة أو خاطئة"}
- {"kind":"dnd","prompt":"ضع كل بطاقة في مكانها.","slots":[{"label":"اسم الخانة","card":"البطاقة التي تخصها"}, ... 3 بالضبط]}
- {"kind":"match","prompt":"طابِق كل عنصر بوصفه.","pairs":[{"term":"...","meaning":"..."}, ... 3 أو 4]}

قواعد المحتوى حسب نمط العرض:
- كل محطة: سطر مقدمة ثم 3 إلى 5 نقاط، كل نقطة تبدأ بـ "▪ " وبصيغة "عنوان: شرح" (العنوان كلمة أو كلمتان).
- timeline: 4 إلى 5 نقاط مرتبة بالتسلسل.
- dialogue: 4 نقاط بالضبط، كل نقطة تبدأ بـ "▪ ط:" (طالب يسأل) أو "▪ م:" (مرشد يجيب) بالتناوب بدءًا بـ ط.
- slides و infographic و cards و diagram: نقاط بصيغة "عنوان: شرح".
اختر النمط الأنسب لمحتوى كل محطة (تسلسل → timeline، مصطلحات → cards، أجزاء → diagram، مقارنات → infographic، فكرة صعبة → dialogue، الباقي → slides).`;

function userPrompt(pages: { n: number; text: string }[], c: Customization, forced: ModeId | null, kinds: string[], truncated: boolean) {
  const body = pages.map((p) => `[صفحة ${p.n}]\n${p.text}`).join("\n\n");
  return [
    `الفئة: ${c.audience}. مدة الدرس المستهدفة: نحو ${c.minutes} دقيقة (اجعل النقاط أقصر للمدد القصيرة وأوسع للطويلة).`,
    forced ? `استخدم نمط العرض "${forced}" في كل المحطات دون استثناء.` : "نوّع أنماط العرض بين المحطات بحسب المحتوى.",
    `أنواع التحدي المسموحة فقط: ${kinds.join("، ")}.`,
    truncated ? "ملاحظة: النص أطول مما نعالجه، فهذا جزؤه الأول. اجعل الدرس عن هذا الجزء." : "",
    "",
    "النص المصدر:",
    '"""',
    body,
    '"""',
  ]
    .filter((l) => l !== "")
    .join("\n");
}

export type Generated = { lesson: Lesson; truncated: boolean; pages: number };

export async function generateLesson(ex: Extracted, custom: Customization): Promise<Generated> {
  const { pages, truncated } = fit(ex);
  const lastPage = pages[pages.length - 1].n;
  const cons = constraintsFor(custom, Math.max(lastPage, pages.length));
  const base = [
    { role: "system" as const, content: SYSTEM },
    { role: "user" as const, content: userPrompt(pages, custom, cons.forcedMode, cons.allowedKinds, truncated) },
  ];

  // up to three tries inside a time budget, each one told exactly what was wrong with the last
  const started = Date.now();
  let problem = "";
  for (let attempt = 0; attempt < 3 && (attempt === 0 || Date.now() - started < 70_000); attempt++) {
    const messages = problem
      ? [...base, { role: "user" as const, content: `الناتج السابق كان مرفوضًا للسبب التالي، أعد كتابة الـ JSON كاملًا وصحّحه: ${problem}` }]
      : base;
    const raw = await chatJson(messages, { timeoutMs: 50_000 });
    try {
      return { lesson: parseLesson(raw, cons), truncated, pages: pages.length };
    } catch (e) {
      if (!(e instanceof LessonShapeError)) throw e;
      problem = e.message;
    }
  }
  throw new AiError(`validation failed: ${problem}`, "لم نستطع بناء درس سليم من هذا المحتوى. جرّب نصًّا أوضح أو أطول قليلًا.", 422);
}
