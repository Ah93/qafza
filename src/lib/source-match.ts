import type { Challenge } from "./lesson";

/** finding the sentence of a source page that a station came from (shared by the API and its tests) */

export function splitSentences(text: string): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n+/)) {
    const parts = para.match(/[^.!؟?؛!۔]+[.!؟?؛!۔]*/g) ?? [para];
    for (const p of parts) if (p.trim()) out.push(p.trim());
  }
  return out;
}

const norm = (s: string) =>
  s
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();

const words = (s: string) => norm(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);

/** index of the sentence sharing the most words with `query`, or -1 when nothing matches */
export function bestSentence(sentences: string[], query: string): number {
  const q = new Set(words(query).map((w) => w.replace(/^ال/, "")));
  if (!q.size) return -1;
  let best = -1;
  let score = 0;
  sentences.forEach((s, i) => {
    const hit = new Set(words(s).map((w) => w.replace(/^ال/, "")));
    let n = 0;
    for (const w of q) if (hit.has(w)) n++;
    const sc = n / Math.sqrt(hit.size || 1);
    if (n >= 2 && sc > score) {
      score = sc;
      best = i;
    }
  });
  return best;
}

/** the words of a challenge that point back at its source passage */
export function challengeText(c: Challenge): string {
  if (c.kind === "mcq") return `${c.question} ${c.options[c.correct].text}`;
  if (c.kind === "tf") return c.statement;
  if (c.kind === "dnd") return `${c.prompt} ${c.slots.map((s) => s.card).join(" ")}`;
  return `${c.prompt} ${c.pairs.map((p) => p.meaning).join(" ")}`;
}
