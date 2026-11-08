import type { BossItem, Challenge, Lesson, ModeId, Station } from "./lesson";

export const STATION_COUNT = 5;
export const BOSS_COUNT = 4;

const MODES: ModeId[] = ["slides", "infographic", "diagram", "timeline", "cards", "dialogue"];

export class LessonShapeError extends Error {}

type Raw = Record<string, unknown>;
const obj = (v: unknown, where: string): Raw => {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new LessonShapeError(`${where}: يجب أن يكون كائنًا`);
  return v as Raw;
};
const arr = (v: unknown, where: string): unknown[] => {
  if (!Array.isArray(v)) throw new LessonShapeError(`${where}: يجب أن يكون مصفوفة`);
  return v;
};
const str = (v: unknown, where: string, max = 600): string => {
  if (typeof v !== "string" || !v.trim()) throw new LessonShapeError(`${where}: نص فارغ`);
  return v.trim().slice(0, max);
};
const optStr = (v: unknown, max = 600): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

function challenge(raw: unknown, i: number, allowed: Set<string>, lenient: boolean): Challenge {
  const c = obj(raw, `challenge ${i}`);
  const kind = c.kind;
  if (typeof kind !== "string" || !allowed.has(kind)) throw new LessonShapeError(`challenge ${i}: نوع غير مسموح (${String(kind)})`);

  if (kind === "mcq") {
    const opts = arr(c.options, `challenge ${i}.options`);
    if (opts.length !== 4) throw new LessonShapeError(`challenge ${i}: يجب 4 خيارات بالضبط`);
    const correct = Number(c.correct);
    if (!Number.isInteger(correct) || correct < 0 || correct > 3) throw new LessonShapeError(`challenge ${i}: correct يجب أن يكون 0 إلى 3`);
    const options = opts.map((o, k) => {
      const oo = obj(o, `challenge ${i}.options[${k}]`);
      const explanation = optStr(oo.explanation, 300);
      if (!lenient && k !== correct && !explanation) throw new LessonShapeError(`challenge ${i}: الخيار الخاطئ ${k} بلا شرح`);
      return { text: str(oo.text, `challenge ${i}.options[${k}].text`, 200), explanation: k === correct ? "" : explanation };
    });
    if (!lenient && new Set(options.map((o) => o.text)).size !== 4) throw new LessonShapeError(`challenge ${i}: خيارات مكررة`);
    return { kind, question: str(c.question, `challenge ${i}.question`, 300), options, correct };
  }

  if (kind === "tf") {
    if (typeof c.answer !== "boolean") throw new LessonShapeError(`challenge ${i}: answer يجب أن يكون true/false`);
    const explanation = optStr(c.explanation, 300);
    if (!lenient && !explanation) throw new LessonShapeError(`challenge ${i}: العبارة بلا شرح`);
    return { kind, statement: str(c.statement, `challenge ${i}.statement`, 300), answer: c.answer, explanation };
  }

  if (kind === "dnd") {
    const slots = arr(c.slots, `challenge ${i}.slots`).map((s, k) => {
      const ss = obj(s, `challenge ${i}.slots[${k}]`);
      return { label: str(ss.label, `challenge ${i}.slots[${k}].label`, 40), card: str(ss.card, `challenge ${i}.slots[${k}].card`, 60) };
    });
    if (slots.length !== 3) throw new LessonShapeError(`challenge ${i}: يجب 3 خانات بالضبط`);
    if (!lenient && (new Set(slots.map((s) => s.card)).size !== 3 || new Set(slots.map((s) => s.label)).size !== 3)) throw new LessonShapeError(`challenge ${i}: بطاقات أو خانات مكررة`);
    return { kind, prompt: str(c.prompt, `challenge ${i}.prompt`, 200), slots };
  }

  const pairs = arr(c.pairs, `challenge ${i}.pairs`).map((p, k) => {
    const pp = obj(p, `challenge ${i}.pairs[${k}]`);
    return { term: str(pp.term, `challenge ${i}.pairs[${k}].term`, 60), meaning: str(pp.meaning, `challenge ${i}.pairs[${k}].meaning`, 120) };
  });
  if (pairs.length < 3 || pairs.length > 4) throw new LessonShapeError(`challenge ${i}: يجب 3 أو 4 أزواج`);
  if (!lenient && (new Set(pairs.map((p) => p.term)).size !== pairs.length || new Set(pairs.map((p) => p.meaning)).size !== pairs.length)) throw new LessonShapeError(`challenge ${i}: أزواج مكررة`);
  return { kind: "match", prompt: str(c.prompt, `challenge ${i}.prompt`, 200), pairs };
}

/** one challenge of the given kind, checked as strictly as in a freshly built lesson */
export function parseChallenge(raw: unknown, kind: Challenge["kind"]): Challenge {
  return challenge(raw, 0, new Set([kind]), false);
}

/**
 * Normalise the "lead line, then ▪ head: body lines" content the player parses.
 * A station whose content does not suit its display mode (a timeline with two steps, a dialogue without speakers)
 * falls back to plain slides, unless the teacher forced one mode for every station: then it must be fixed by a retry.
 */
function content(raw: unknown, i: number, wanted: ModeId, lenient: boolean, forced: boolean): { text: string; mode: ModeId } {
  const text = str(raw, `station ${i}.content`, 1800).replace(/\r/g, "");
  if (lenient) return { text, mode: wanted };

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const lead = lines.find((l) => !l.startsWith("▪")) ?? "";
  const items = lines
    .filter((l) => l.startsWith("▪"))
    .map((l) => "▪ " + l.replace(/^▪\s*/, ""))
    .slice(0, 6); // more than six points is just long, not wrong
  if (!lead) throw new LessonShapeError(`station ${i}: ينقص سطر المقدمة`);
  if (items.length < 2) throw new LessonShapeError(`station ${i}: يحتاج نقطتين ▪ على الأقل (وجدنا ${items.length})`);

  const labelled = items.every((l) => /[:：]/.test(l));
  const speakers = items.every((l) => /^▪ [طم]\s*[:：]/.test(l));
  const fits: Record<ModeId, boolean> = {
    timeline: items.length >= 3 && labelled,
    // a dialogue line longer than 25 words stops being a conversation: such a station is shown as slides instead
    dialogue: items.length >= 2 && speakers && items.every((l) => l.split(/\s+/).length <= 27),
    slides: labelled,
    infographic: labelled,
    cards: labelled,
    diagram: labelled,
  };
  let mode = wanted;
  if (!fits[wanted]) {
    if (forced) throw new LessonShapeError(`station ${i}: المحتوى لا يناسب النمط ${wanted} (${items.length} نقاط)`);
    mode = "slides";
    if (!fits.slides) throw new LessonShapeError(`station ${i}: كل نقطة بصيغة «عنوان: شرح»`);
  }
  return { text: [lead, ...items].join("\n"), mode };
}

export type Constraints = {
  /** a single display mode for every station, or null to let the model choose */
  forcedMode: ModeId | null;
  allowedKinds: Challenge["kind"][];
  pageCount: number;
  /** accept hand-edited lessons: check the structure, not the style rules the AI must follow */
  lenient?: boolean;
};

/** turn the model's JSON into a trusted Lesson, or throw a LessonShapeError saying exactly what is wrong */
export function parseLesson(raw: unknown, c: Constraints): Lesson {
  const root = obj(raw, "lesson");
  const stationsRaw = arr(root.stations, "stations");
  if (stationsRaw.length !== STATION_COUNT) throw new LessonShapeError(`يجب ${STATION_COUNT} محطات بالضبط (وجدنا ${stationsRaw.length})`);
  const allowed = new Set<string>(c.allowedKinds);

  const stations: Station[] = stationsRaw.map((s, i) => {
    const st = obj(s, `station ${i}`);
    const wanted: ModeId = c.forcedMode ?? (MODES.includes(st.mode as ModeId) ? (st.mode as ModeId) : "slides");
    const page = Math.round(Number(st.page));
    if (!Number.isFinite(page) || page < 1 || (!c.lenient && page > c.pageCount)) throw new LessonShapeError(`station ${i}: رقم الصفحة ${String(st.page)} خارج 1..${c.pageCount}`);
    const review = optStr(st.review, 300);
    const body = content(st.content, i, wanted, !!c.lenient, !!c.forcedMode);
    return {
      id: `s${i + 1}`,
      title: str(st.title, `station ${i}.title`, 80),
      mode: body.mode,
      page,
      content: body.text,
      keyIdea: str(st.keyIdea, `station ${i}.keyIdea`, 200),
      ...(review ? { review } : {}),
      challenge: challenge(st.challenge, i, allowed, !!c.lenient),
    };
  });

  const bossRaw = arr(root.boss, "boss");
  if (bossRaw.length !== BOSS_COUNT) throw new LessonShapeError(`تحدّي الزعيم يحتاج ${BOSS_COUNT} عبارات (وجدنا ${bossRaw.length})`);
  const boss: BossItem[] = bossRaw.map((b, i) => {
    const bb = obj(b, `boss ${i}`);
    if (typeof bb.answer !== "boolean") throw new LessonShapeError(`boss ${i}: answer يجب أن يكون true/false`);
    return { statement: str(bb.statement, `boss ${i}.statement`, 240), answer: bb.answer };
  });
  if (!c.lenient && (boss.every((b) => b.answer) || boss.every((b) => !b.answer))) throw new LessonShapeError("عبارات الزعيم يجب أن تجمع بين الصحيح والخاطئ");

  return { title: str(root.title, "title", 80), stations, boss };
}

/** every kind of challenge, for checking lessons that a teacher has edited */
export const EDITED_LESSON: Constraints = { forcedMode: null, allowedKinds: ["mcq", "tf", "dnd", "match"], pageCount: 9999, lenient: true };
