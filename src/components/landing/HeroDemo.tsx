"use client";

import { useState } from "react";
import { rankOf } from "@/lib/play";

/** the example player bar: the rank always comes from the real rank table, never typed by hand */
const EXAMPLE_POINTS = 340;

const MODES = ["إنفوجرافيك", "شرائح", "خط زمني", "بطاقات"] as const;
type Mode = (typeof MODES)[number];

const FACTS = [
  { label: "الشكل", value: "قرص مقعّر من الجانبين", tone: "text-sun" },
  { label: "الحجم", value: "نحو 7 إلى 8 ميكرومترات", tone: "text-pink-300" },
  { label: "العمر", value: "نحو 120 يومًا", tone: "text-mint" },
  { label: "الوظيفة", value: "نقل الأكسجين", tone: "text-violet-300" },
];

const SLIDES = [
  "أكثر خلايا الدم عددًا في الجسم",
  "لونها الأحمر هو سرّ وظيفتها",
  "تنقل الأكسجين إلى كل الأنسجة",
];

const TIMELINE = ["الرئتان", "القلب", "الشرايين", "الأنسجة"];

const CARDS = [
  { term: "الهيموغلوبين", meaning: "بروتين فيه حديد يحمل الأكسجين" },
  { term: "نخاع العظم", meaning: "مصنع خلايا الدم الحمراء" },
];

function Cell() {
  return (
    <div className="relative grid size-24 place-items-center rounded-full bg-gradient-to-br from-rose-400 to-red-600 shadow-[0_0_40px_rgba(244,63,94,0.5)]">
      <div className="size-10 rounded-full bg-red-800/60" />
    </div>
  );
}

export function HeroDemo() {
  const [mode, setMode] = useState<Mode>("إنفوجرافيك");

  return (
    <div className="rounded-[28px] bg-indigo-ink p-3 shadow-2xl shadow-indigo-deep/30">
      <div className="dots rounded-[22px] bg-gradient-to-br from-indigo-deep to-[#3a1a7a] p-3">
        <div
          role="tablist"
          className="mb-3 grid grid-cols-4 gap-1 rounded-full bg-white/10 p-1 text-[11px] font-medium text-white/70"
        >
          {MODES.map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-full py-1.5 transition ${
                mode === m ? "bg-white font-semibold text-indigo-deep" : "hover:text-white"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="grid min-h-[188px] items-center gap-3 rounded-2xl bg-white/5 p-3 sm:grid-cols-2">
          {mode === "إنفوجرافيك" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {FACTS.map((f) => (
                  <div key={f.label} className="rounded-xl bg-white/10 p-2.5 text-[11px] text-white">
                    <div className={`mb-1 font-semibold ${f.tone}`}>{f.label}</div>
                    <div className="font-medium leading-5">{f.value}</div>
                  </div>
                ))}
              </div>
              <div className="grid place-items-center">
                <Cell />
              </div>
            </>
          )}

          {mode === "شرائح" && (
            <div className="space-y-2 sm:col-span-2">
              {SLIDES.map((s, i) => (
                <div
                  key={s}
                  className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-medium text-white"
                >
                  <span className="grid size-6 place-items-center rounded-full bg-sun text-[11px] font-bold text-indigo-deep">
                    {i + 1}
                  </span>
                  {s}
                </div>
              ))}
            </div>
          )}

          {mode === "خط زمني" && (
            <ol className="flex items-center justify-between gap-2 sm:col-span-2">
              {TIMELINE.map((t, i) => (
                <li key={t} className="flex flex-1 flex-col items-center gap-2 text-[11px] text-white">
                  <span className="grid size-8 place-items-center rounded-full bg-brand font-bold">
                    {i + 1}
                  </span>
                  {t}
                </li>
              ))}
            </ol>
          )}

          {mode === "بطاقات" && (
            <div className="grid grid-cols-2 gap-2 sm:col-span-2">
              {CARDS.map((c) => (
                <div key={c.term} className="rounded-xl bg-white p-3 text-center text-indigo-deep">
                  <div className="text-sm font-bold">{c.term}</div>
                  <div className="mt-1 text-[11px] text-indigo-deep/60">{c.meaning}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-white px-3 py-2.5">
          <span className="rounded-full bg-sun px-2.5 py-1 text-[10px] font-bold text-indigo-deep">
            {rankOf(EXAMPLE_POINTS).name}
          </span>
          <span className="rounded-full bg-mint px-2.5 py-1 text-[10px] font-bold text-white">
            {EXAMPLE_POINTS} نقطة معرفة
          </span>
          <span className="flex items-center gap-1 text-[11px] text-rose-500">
            <span className="text-orange-500">🔥 3</span>
            ♥ ♥ ♥
          </span>
        </div>
      </div>
    </div>
  );
}
