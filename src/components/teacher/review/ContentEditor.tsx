"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { ModeId, Station } from "@/lib/lesson";
import { StationView, parseContent, type Item } from "@/components/student/play/StationView";
import { inputBase } from "./parts";

const MAX_ITEMS = 6;

/** a head cannot hold a colon (the colon is what separates it from its text), and nothing may hold a line break */
const oneLine = (v: string) => v.replace(/\n/g, " ");
const cleanHead = (v: string) => oneLine(v).replace(/[:：]/g, " ");

/** the lead line, then one "▪ head: text" line per item: the shape every display mode reads */
export function serialize(lead: string, items: Item[]): string {
  return [oneLine(lead), ...items.map((it) => `▪ ${it.head ? `${it.head}: ` : ""}${oneLine(it.body)}`)].join("\n");
}

/** switching between a dialogue and any other mode keeps every word: lines become points and points become lines */
export function convertContent(content: string, from: ModeId, to: ModeId): string {
  if ((from === "dialogue") === (to === "dialogue")) return content;
  const { lead, items } = parseContent(content);
  const next: Item[] =
    to === "dialogue"
      ? items.map((it, i) => ({ head: i % 2 === 0 ? "ط" : "م", body: it.head ? `${it.head}: ${it.body}` : it.body }))
      : items.map((it) => ({ head: it.head === "ط" ? "سؤال" : it.head === "م" ? "جواب" : it.head, body: it.body }));
  return serialize(lead, next);
}

const LABELS: Record<ModeId, { head: string; body: string; item: string }> = {
  slides: { head: "عنوان النقطة", body: "الشرح", item: "نقطة" },
  infographic: { head: "العنصر", body: "التفصيل", item: "عنصر" },
  timeline: { head: "اسم المرحلة", body: "ما يحدث فيها", item: "مرحلة" },
  dialogue: { head: "", body: "السطر", item: "سطر" },
  cards: { head: "وجه البطاقة (المصطلح)", body: "ظهرها (المعنى)", item: "بطاقة" },
  diagram: { head: "الجزء", body: "وصفه", item: "جزء" },
};

const tiny = "grid size-8 place-items-center rounded-lg border border-violet/15 bg-white text-indigo-deep/70 transition hover:border-violet/40 hover:text-violet disabled:opacity-30";

/**
 * Editing a station's content, shaped by its display mode: points with titles, ordered stages, cards, or a
 * conversation. Each element can be moved, deleted or added, and the preview shows exactly what students see.
 */
export function ContentEditor({ station, onChange }: { station: Station; onChange: (content: string) => void }) {
  const mode = station.mode;
  const L = LABELS[mode];
  const id = station.id;

  // the editor keeps its own rows (an empty row must survive until it is filled); a change from outside (mode switch, undo) replaces them
  const [seen, setSeen] = useState(station.content);
  const first = parseContent(station.content);
  const [lead, setLead] = useState(first.lead);
  const [items, setItems] = useState<Item[]>(first.items);
  if (station.content !== seen) {
    const p = parseContent(station.content);
    setSeen(station.content);
    setLead(p.lead);
    setItems(p.items);
  }

  function commit(nextLead: string, nextItems: Item[]) {
    const c = serialize(nextLead, nextItems);
    setSeen(c);
    setLead(nextLead);
    setItems(nextItems);
    onChange(c);
  }
  const setItem = (i: number, patch: Partial<Item>) => commit(lead, items.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    commit(lead, next);
  };
  const remove = (i: number) => commit(lead, items.filter((_, k) => k !== i));
  const add = () => {
    const role = mode === "dialogue" ? (items.at(-1)?.head === "ط" ? "م" : "ط") : "";
    commit(lead, [...items, { head: role, body: "" }]);
  };

  return (
    <div className="mt-4">
      <label htmlFor={`${id}-lead`} className="mb-1.5 block text-xs font-bold text-indigo-deep/70">
        المقدمة (سطر واحد)
      </label>
      <input id={`${id}-lead`} value={lead} onChange={(e) => commit(oneLine(e.target.value), items)} className={`${inputBase} h-11 text-sm`} />

      <p className="mb-1.5 mt-4 text-xs font-bold text-indigo-deep/70">
        {mode === "timeline" ? "المراحل بالترتيب" : mode === "dialogue" ? "الحوار: ط للطالب، م للمرشد" : "المحتوى"} · {items.length} من {MAX_ITEMS}
      </p>
      <ol className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 rounded-2xl border border-violet/10 bg-violet/[0.03] p-2.5">
            <span className="mt-1.5 grid size-6 shrink-0 place-items-center rounded-full bg-violet/10 text-xs font-bold text-violet">{i + 1}</span>
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              {mode === "dialogue" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setItem(i, { head: it.head === "ط" ? "م" : "ط" })}
                    aria-label={`المتحدّث في السطر ${i + 1}: ${it.head === "ط" ? "الطالب" : "المرشد"}. اضغط للتبديل`}
                    className={`h-10 rounded-xl border text-sm font-bold transition ${it.head === "ط" ? "border-pink-300 bg-pink-50 text-pink-700" : "border-violet/30 bg-violet/10 text-violet"}`}
                  >
                    {it.head === "ط" ? "ط · طالب" : "م · مرشد"}
                  </button>
                  <input aria-label={`${L.body} ${i + 1}`} value={it.body} onChange={(e) => setItem(i, { body: e.target.value })} className={`${inputBase} h-10 text-sm sm:col-span-1`} />
                </>
              ) : (
                <>
                  <input aria-label={`${L.head} ${i + 1}`} placeholder={L.head} value={it.head} onChange={(e) => setItem(i, { head: cleanHead(e.target.value) })} className={`${inputBase} h-10 text-sm font-bold`} />
                  <input aria-label={`${L.body} ${i + 1}`} placeholder={L.body} value={it.body} onChange={(e) => setItem(i, { body: e.target.value })} className={`${inputBase} h-10 text-sm`} />
                </>
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              <button type="button" className={tiny} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`حرّك ${L.item} ${i + 1} للأعلى`}>
                <ArrowUp className="size-3.5" />
              </button>
              <button type="button" className={tiny} disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`حرّك ${L.item} ${i + 1} للأسفل`}>
                <ArrowDown className="size-3.5" />
              </button>
              <button type="button" className={`${tiny} hover:border-rose-300 hover:text-[#c0174f]`} onClick={() => remove(i)} aria-label={`احذف ${L.item} ${i + 1}`}>
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={add}
        disabled={items.length >= MAX_ITEMS}
        className="mt-2.5 flex items-center gap-1.5 rounded-full border border-dashed border-violet/30 px-4 py-2 text-xs font-bold text-violet transition hover:bg-violet/5 disabled:opacity-40"
      >
        <Plus className="size-3.5" />
        أضف {L.item}
      </button>

      <div className="mt-4 rounded-2xl border border-violet/10 bg-white p-3.5">
        <p className="mb-2 text-xs font-bold text-indigo-deep/70">معاينة: كما يراها الطالب</p>
        <StationView station={station} />
      </div>
    </div>
  );
}
