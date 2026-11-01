import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class SourceError extends Error {}

export type Page = { n: number; text: string };
export type Extracted = { pages: Page[]; chars: number };

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** what we hand to the model: enough for a 15-page lesson, small enough to stay fast and cheap */
export const MAX_CHARS = 28_000;

const CHUNK = 1800;

/** split plain text into numbered "pages" so every station can cite where it came from */
function paginate(text: string): Page[] {
  const clean = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const pages: Page[] = [];
  let buf = "";
  for (const para of clean.split(/\n\n+/)) {
    if (buf && buf.length + para.length > CHUNK) {
      pages.push({ n: pages.length + 1, text: buf.trim() });
      buf = "";
    }
    buf += (buf ? "\n\n" : "") + para;
    while (buf.length > CHUNK * 1.6) {
      pages.push({ n: pages.length + 1, text: buf.slice(0, CHUNK).trim() });
      buf = buf.slice(CHUNK);
    }
  }
  if (buf.trim()) pages.push({ n: pages.length + 1, text: buf.trim() });
  return pages;
}

function finish(pages: Page[]): Extracted {
  const nonEmpty = pages.filter((p) => p.text.trim().length > 0);
  const chars = nonEmpty.reduce((t, p) => t + p.text.length, 0);
  if (chars < 120) throw new SourceError("المحتوى قصير جدًا أو فارغ. تأكد أن الملف يحتوي نصًّا يمكن قراءته (وليس صورًا ممسوحة).");
  return { pages: nonEmpty, chars };
}

/** cut the text to the budget, keeping page numbers */
export function fit(ex: Extracted): { pages: Page[]; truncated: boolean } {
  let used = 0;
  const kept: Page[] = [];
  for (const p of ex.pages) {
    if (used + p.text.length > MAX_CHARS) {
      const room = MAX_CHARS - used;
      if (room > 400) kept.push({ n: p.n, text: p.text.slice(0, room) });
      return { pages: kept, truncated: true };
    }
    kept.push(p);
    used += p.text.length;
  }
  return { pages: kept, truncated: false };
}

export async function fromFile(file: File): Promise<Extracted> {
  if (file.size > MAX_FILE_BYTES) throw new SourceError("الملف أكبر من 10 ميغابايت.");
  const name = file.name.toLowerCase();
  const buf = new Uint8Array(await file.arrayBuffer());

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    try {
      const pdf = await getDocumentProxy(buf);
      const { text } = await extractText(pdf, { mergePages: false });
      return finish((text as string[]).map((t, i) => ({ n: i + 1, text: t.replace(/\s+/g, " ").trim() })));
    } catch {
      throw new SourceError("تعذّرت قراءة ملف PDF. ربما هو محمي بكلمة مرور أو تالف.");
    }
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    try {
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
      return finish(paginate(value));
    } catch {
      throw new SourceError("تعذّرت قراءة ملف Word. جرّب حفظه بصيغة PDF.");
    }
  }

  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    return finish(paginate(new TextDecoder("utf-8").decode(buf)));
  }

  if (name.endsWith(".ppt") || name.endsWith(".pptx") || name.endsWith(".doc")) {
    throw new SourceError("هذه الصيغة غير مدعومة بعد. احفظ الملف بصيغة PDF أو DOCX وارفعه من جديد.");
  }
  throw new SourceError("صيغة الملف غير مدعومة. ارفع PDF أو DOCX أو TXT.");
}

export function fromText(text: string): Extracted {
  return finish(paginate(text));
}

/* ---------- links: fetched server-side, so they must not be allowed to reach our own network ---------- */

function privateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127.") || v.startsWith("::ffff:10.") || v.startsWith("::ffff:192.168.");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function assertPublic(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new SourceError("الرابط يجب أن يبدأ بـ http أو https.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new SourceError("هذا الرابط غير مسموح به.");
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((r) => r.address);
  if (ips.length === 0) throw new SourceError("تعذّر الوصول إلى هذا الرابط. تأكد من كتابته.");
  if (ips.some(privateIp)) throw new SourceError("هذا الرابط غير مسموح به.");
}

const VIDEO_HOSTS = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|dailymotion\.com)$/i;

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n");
}

export async function fromUrl(raw: string): Promise<Extracted> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new SourceError("الرابط غير صحيح.");
  }
  if (VIDEO_HOSTS.test(url.hostname)) {
    throw new SourceError("لا نستطيع قراءة الفيديو مباشرة بعد. افتح النص المفرّغ للفيديو، ثم الصقه في تبويب «نص».");
  }

  let res: Response | null = null;
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12_000);
    try {
      res = await fetch(url, { redirect: "manual", signal: ctrl.signal, headers: { "User-Agent": "QafzaBot/1.0", Accept: "text/html,text/plain,application/pdf;q=0.9" } });
    } catch {
      throw new SourceError("تعذّر فتح الرابط. تأكد أنه يعمل ثم حاول مجددًا.");
    } finally {
      clearTimeout(timer);
    }
    const next = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && next) {
      url = new URL(next, url);
      res = null;
      continue;
    }
    break;
  }
  if (!res) throw new SourceError("الرابط يحوّل إلى صفحات كثيرة.");
  if (!res.ok) throw new SourceError(`الموقع ردّ بخطأ (${res.status}). جرّب رابطًا آخر.`);

  const type = res.headers.get("content-type") ?? "";
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_FILE_BYTES) throw new SourceError("الصفحة كبيرة جدًا.");
  const data = new Uint8Array(await res.arrayBuffer());
  if (data.byteLength > MAX_FILE_BYTES) throw new SourceError("الصفحة كبيرة جدًا.");

  if (type.includes("pdf")) return fromFile(new File([data], "page.pdf", { type: "application/pdf" }));
  const body = new TextDecoder("utf-8").decode(data);
  return finish(paginate(type.includes("html") || /<html|<body|<p[ >]/i.test(body.slice(0, 2000)) ? htmlToText(body) : body));
}
