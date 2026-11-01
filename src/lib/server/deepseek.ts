import "server-only";

const BASE = "https://api.deepseek.com";

export class AiError extends Error {
  constructor(
    message: string,
    /** a message safe to show the teacher */
    readonly userMessage: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

type Msg = { role: "system" | "user" | "assistant"; content: string };

/** one JSON-mode chat completion; the key never leaves the server */
export async function chatJson(messages: Msg[], opts: { maxTokens?: number; timeoutMs?: number } = {}): Promise<unknown> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new AiError("DEEPSEEK_API_KEY is not set", "خدمة الذكاء الاصطناعي غير مهيّأة على الخادم.", 503);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 110_000);
  let res: Response;
  try {
    res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages,
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: opts.maxTokens ?? 6000,
      }),
    });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "AbortError";
    throw new AiError(String(e), timedOut ? "استغرق البناء وقتًا أطول من المتوقع. جرّب ملفًا أقصر." : "تعذّر الاتصال بخدمة الذكاء الاصطناعي. حاول بعد قليل.", timedOut ? 504 : 502);
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 || res.status === 403) throw new AiError(`auth ${res.status}`, "مفتاح خدمة الذكاء الاصطناعي غير صالح.", 503);
  if (res.status === 402) throw new AiError("insufficient balance", "رصيد خدمة الذكاء الاصطناعي نفد.", 503);
  if (res.status === 429) throw new AiError("rate limited", "الخدمة مشغولة الآن. حاول بعد دقيقة.", 429);
  if (!res.ok) throw new AiError(`http ${res.status}: ${(await res.text()).slice(0, 200)}`, "تعذّر بناء الدرس الآن. حاول مرة أخرى.");

  const data = (await res.json()) as { choices?: { message?: { content?: string }; finish_reason?: string }[] };
  const choice = data.choices?.[0];
  const text = choice?.message?.content ?? "";
  if (choice?.finish_reason === "length") throw new AiError("truncated output", "كان الملف طويلًا فانقطع البناء. جرّب جزءًا أقصر منه.");
  try {
    return JSON.parse(text);
  } catch {
    throw new AiError(`invalid JSON: ${text.slice(0, 120)}`, "جاء ردّ الذكاء الاصطناعي غير مفهوم. حاول مرة أخرى.");
  }
}
