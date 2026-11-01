"use client";

import { TriangleAlert } from "lucide-react";
import { MODES, type Station } from "@/lib/lesson";
import { MODE_ICONS } from "../modeIcons";
import { CardHead, Label, inputBase } from "./parts";
import { useFlow } from "../FlowProvider";

export function StationCard({ station, index }: { station: Station; index: number }) {
  const { patchStation } = useFlow();
  const ModeIcon = MODE_ICONS[station.mode];
  const id = station.id;

  return (
    <article
      id={`st-${index}`}
      className="scroll-mt-24 rounded-[26px] border border-violet/10 bg-white p-5 shadow-lg shadow-violet/5 sm:p-6"
    >
      <CardHead icon={ModeIcon} iconClass="bg-gradient-to-br from-indigo-deep to-indigo-ink" page={station.page}>
        <span className="text-sm font-bold text-violet">
          المحطة {index + 1} · هدف تعلّم
        </span>
      </CardHead>

      {station.review && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-500 text-white">
            <TriangleAlert className="size-4" />
          </span>
          <p className="min-w-0 flex-1 text-xs font-semibold leading-6 text-amber-900">
            <b>يحتاج مراجعة:</b> {station.review}
          </p>
          <button
            onClick={() => patchStation(id, { review: undefined })}
            className="shrink-0 rounded-full bg-amber-500 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-600"
          >
            راجعته
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="me-1 text-[11px] font-bold text-indigo-deep/60">نمط العرض</span>
        {MODES.map((m) => {
          const Icon = MODE_ICONS[m.id];
          const on = station.mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => patchStation(id, { mode: m.id })}
              aria-pressed={on}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition ${
                on
                  ? "border-violet bg-violet text-white shadow-md shadow-violet/25"
                  : "border-violet/15 bg-white text-indigo-deep hover:border-violet/40"
              }`}
            >
              {m.label}
              <Icon className={`size-3 ${on ? "" : "text-violet"}`} />
            </button>
          );
        })}
        <span className="flex items-center gap-1.5 rounded-full border border-dashed border-violet/25 px-3 py-1.5 text-[11px] font-bold text-indigo-deep/45">
          +4 أنماط
          <span className="rounded-full bg-violet/10 px-2 py-0.5 text-[10px]">قريبًا</span>
        </span>
      </div>

      <div className="mt-4">
        <Label htmlFor={`${id}-t`}>العنوان</Label>
        <input
          id={`${id}-t`}
          value={station.title}
          onChange={(e) => patchStation(id, { title: e.target.value })}
          className={`${inputBase} h-12 text-sm font-bold`}
        />
      </div>

      <div className="mt-4">
        <Label htmlFor={`${id}-c`}>المحتوى</Label>
        <textarea
          id={`${id}-c`}
          value={station.content}
          onChange={(e) => patchStation(id, { content: e.target.value })}
          rows={5}
          className={`${inputBase} resize-y py-3 text-[13px] leading-7`}
        />
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3">
        <label htmlFor={`${id}-k`} className="shrink-0 text-[11px] font-bold text-amber-700">
          الفكرة الأهم
        </label>
        <input
          id={`${id}-k`}
          value={station.keyIdea}
          onChange={(e) => patchStation(id, { keyIdea: e.target.value })}
          className="min-w-0 flex-1 bg-transparent text-[13px] font-bold text-amber-950 outline-none"
        />
      </div>
    </article>
  );
}
