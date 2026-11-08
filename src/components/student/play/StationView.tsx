"use client";

import { useState } from "react";
import { BookOpen, Zap } from "lucide-react";
import type { Station } from "@/lib/lesson";

export type Item = { head: string; body: string };

export function parseContent(content: string): { lead: string; items: Item[] } {
  const [lead = "", ...rest] = content.split("\n");
  const items = rest
    .map((l) => l.replace(/^▪\s*/, "").trim())
    .filter(Boolean)
    .map((l) => {
      const at = l.search(/[:：]/);
      return at === -1 ? { head: "", body: l } : { head: l.slice(0, at).trim(), body: l.slice(at + 1).trim() };
    });
  return { lead, items };
}

const TILE_TONES = ["text-sun", "text-pink-300", "text-mint", "text-violet-300", "text-sky-300", "text-orange-300"];

function Orbit({ children }: { children?: React.ReactNode }) {
  return (
    <div className="dots relative grid min-h-[120px] place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#241356] to-[#5b21b6] px-6 py-5 text-white">
      <span className="absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-[50%] border border-dashed border-white/20" />
      <span className="absolute start-[16%] top-[22%] size-3 rounded-full bg-violet-300" />
      <span className="absolute end-[42%] top-[14%] size-2.5 rounded-full bg-teal-300" />
      <span className="absolute bottom-[16%] end-[24%] size-4 rotate-45 rounded-sm bg-sun" />
      {children}
    </div>
  );
}

function Slides({ lead, items }: { lead: string; items: Item[] }) {
  const [shown, setShown] = useState(1);
  return (
    <>
      <Orbit>
        <div className="relative z-10 flex w-full items-center justify-between gap-5">
          <p className="max-w-md text-[15px] font-bold leading-7">{lead}</p>
          <span className="grid size-[58px] shrink-0 place-items-center rounded-2xl bg-brand shadow-lg">
            <BookOpen className="size-6" />
          </span>
        </div>
      </Orbit>
      <ol className="mt-3 space-y-2.5">
        {items.slice(0, shown).map((it, i) => (
          <li key={i} className="flex animate-[pop_.3s_ease-out] items-center gap-3 rounded-2xl border border-violet/10 bg-violet/[0.03] px-4 py-3.5 text-[14px] text-indigo-deep/85">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sun text-xs font-bold text-indigo-deep">{i + 1}</span>
            <span>
              {it.head && <b className="font-bold text-indigo-deep">{it.head}: </b>}
              {it.body}
            </span>
          </li>
        ))}
      </ol>
      {shown < items.length && (
        <button
          onClick={() => setShown((n) => n + 1)}
          className="mt-3 rounded-full border border-dashed border-violet/40 px-7 py-2.5 text-xs font-bold text-violet transition hover:bg-violet/5"
        >
          اكشف النقطة التالية
        </button>
      )}
    </>
  );
}

function Infographic({ lead, items }: { lead: string; items: Item[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <>
      <p className="mb-3 text-sm font-semibold text-indigo-deep/70">{lead}</p>
      <div className="dots relative grid gap-2.5 overflow-hidden rounded-3xl bg-gradient-to-br from-[#241356] to-[#5b21b6] p-3.5 sm:grid-cols-2">
        {items.map((it, i) => {
          const on = open === i;
          return (
            <button
              key={i}
              onClick={() => setOpen(on ? null : i)}
              aria-expanded={on}
              className={`relative z-10 rounded-2xl p-3.5 text-start text-white transition ${on ? "bg-white/20 ring-2 ring-white/40" : "bg-white/10 hover:bg-white/15"}`}
            >
              <span className={`block text-xs font-bold ${TILE_TONES[i % TILE_TONES.length]}`}>{it.head || `حقيقة ${i + 1}`}</span>
              <span className="mt-1 block text-sm font-semibold leading-6">{on ? it.body : "اضغط لتعرف"}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function Timeline({ lead, items }: { lead: string; items: Item[] }) {
  const [at, setAt] = useState(0);
  const cur = items[at];
  return (
    <>
      <p className="mb-3 text-sm font-semibold text-indigo-deep/70">{lead}</p>
      <div className="dots relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#241356] to-[#5b21b6] px-5 pb-5 pt-6 text-white">
        <ol className="relative z-10 flex items-start justify-between">
          <span aria-hidden className="absolute inset-x-6 top-[17px] border-t border-dotted border-white/30" />
          {items.map((it, i) => (
            <li key={i} className="relative z-10 flex flex-1 flex-col items-center gap-2">
              <button
                onClick={() => setAt(i)}
                aria-current={at === i ? "step" : undefined}
                aria-label={`المرحلة ${i + 1}: ${it.head}`}
                className={`grid size-9 place-items-center rounded-full text-sm font-bold transition ${
                  at === i ? "bg-sun text-indigo-deep ring-4 ring-sun/30" : i < at ? "bg-violet-400 text-white" : "bg-white/15 text-white"
                }`}
              >
                {i + 1}
              </button>
              <span className="text-xs font-semibold text-white/85">{it.head}</span>
            </li>
          ))}
        </ol>
        <div key={at} className="relative z-10 mt-5 animate-[pop_.25s_ease-out] rounded-2xl bg-white px-5 py-3.5 text-indigo-deep">
          <p className="text-lg font-bold">{cur?.head}</p>
          <p className="mt-0.5 text-sm font-medium text-indigo-deep/70">{cur?.body}</p>
        </div>
      </div>
    </>
  );
}

function Dialogue({ lead, items }: { lead: string; items: Item[] }) {
  const [shown, setShown] = useState(1);
  return (
    <>
      <p className="mb-3 text-sm font-semibold text-indigo-deep/70">{lead}</p>
      <ul className="space-y-2.5">
        {items.slice(0, shown).map((it, i) => {
          const guide = it.head === "م";
          return (
            <li key={i} className={`flex animate-[pop_.3s_ease-out] items-end gap-2.5 ${guide ? "flex-row-reverse" : ""}`}>
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${guide ? "bg-violet" : "bg-pink-500"}`}
                title={guide ? "المرشد" : "الطالبة"}
              >
                {it.head || "؟"}
              </span>
              <p className={`max-w-[78%] rounded-2xl px-4 py-3 text-[14px] font-medium leading-7 ${guide ? "rounded-es-sm bg-violet/10 text-indigo-deep" : "rounded-ee-sm bg-pink-50 text-indigo-deep"}`}>
                {it.body}
              </p>
            </li>
          );
        })}
      </ul>
      {shown < items.length && (
        <button
          onClick={() => setShown((n) => n + 1)}
          className="mt-3 rounded-full border border-dashed border-violet/40 px-7 py-2.5 text-xs font-bold text-violet transition hover:bg-violet/5"
        >
          تابع الحوار
        </button>
      )}
    </>
  );
}

function Cards({ lead, items }: { lead: string; items: Item[] }) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  return (
    <>
      <p className="mb-3 text-sm font-semibold text-indigo-deep/70">{lead}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((it, i) => {
          const on = flipped[i];
          return (
            <button
              key={i}
              onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
              aria-pressed={!!on}
              className={`min-h-[132px] rounded-2xl p-4 text-start transition ${
                on ? "bg-white text-indigo-deep shadow-md ring-2 ring-violet/30" : "bg-gradient-to-br from-violet to-orchid text-white shadow-lg shadow-violet/25 hover:-translate-y-0.5"
              }`}
            >
              {on ? (
                <span className="text-sm font-semibold leading-6">{it.body}</span>
              ) : (
                <>
                  <span className="block text-lg font-bold">{it.head || `بطاقة ${i + 1}`}</span>
                  <span className="mt-2 block text-xs font-medium text-white/75">اضغط لتقلبها</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

function Diagram({ lead, items }: { lead: string; items: Item[] }) {
  const [open, setOpen] = useState(0);
  return (
    <>
      <p className="mb-3 text-sm font-semibold text-indigo-deep/70">{lead}</p>
      <div className="dots relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#241356] to-[#5b21b6] p-5 text-white">
        <div className="relative z-10 grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <div className="space-y-2">
            {items.filter((_, i) => i % 2 === 0).map((it) => {
              const i = items.indexOf(it);
              return (
                <button key={i} onClick={() => setOpen(i)} className={`block w-full rounded-xl px-3 py-2 text-start text-xs font-bold transition ${open === i ? "bg-white text-indigo-deep" : "bg-white/10 hover:bg-white/20"}`}>
                  {it.head || `جزء ${i + 1}`}
                </button>
              );
            })}
          </div>
          <div className="mx-auto grid size-28 place-items-center rounded-full bg-gradient-to-br from-rose-400 to-red-600 shadow-[0_0_40px_rgba(244,63,94,.5)]">
            <span className="size-11 rounded-full bg-red-800/60" />
          </div>
          <div className="space-y-2">
            {items.filter((_, i) => i % 2 === 1).map((it) => {
              const i = items.indexOf(it);
              return (
                <button key={i} onClick={() => setOpen(i)} className={`block w-full rounded-xl px-3 py-2 text-start text-xs font-bold transition ${open === i ? "bg-white text-indigo-deep" : "bg-white/10 hover:bg-white/20"}`}>
                  {it.head || `جزء ${i + 1}`}
                </button>
              );
            })}
          </div>
        </div>
        <p key={open} className="relative z-10 mt-4 animate-[pop_.25s_ease-out] rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold leading-7">
          {items[open]?.body}
        </p>
      </div>
    </>
  );
}

export function StationView({ station }: { station: Station }) {
  const { lead, items } = parseContent(station.content);
  const props = { lead, items };
  return (
    <div key={station.id}>
      {station.mode === "slides" && <Slides {...props} />}
      {station.mode === "infographic" && <Infographic {...props} />}
      {station.mode === "timeline" && <Timeline {...props} />}
      {station.mode === "dialogue" && <Dialogue {...props} />}
      {station.mode === "cards" && <Cards {...props} />}
      {station.mode === "diagram" && <Diagram {...props} />}

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sun text-indigo-deep">
          <Zap className="size-4" fill="currentColor" />
        </span>
        <div>
          <p className="text-xs font-bold text-amber-700">الفكرة الأهم</p>
          <p className="text-[14px] font-bold text-amber-950">{station.keyIdea}</p>
        </div>
      </div>
    </div>
  );
}
