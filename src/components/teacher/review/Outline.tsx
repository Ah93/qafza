"use client";

import { Lock } from "lucide-react";
import { CHALLENGE_LABELS, type Lesson } from "@/lib/lesson";
import { MODE_ICONS } from "../modeIcons";

function jump(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Outline({ lesson }: { lesson: Lesson }) {
  const pending = lesson.stations.filter((s) => s.review).length;
  return (
    <div className="space-y-3 lg:sticky lg:top-20">
      <nav aria-label="مخطط الدرس" className="rounded-3xl border border-violet/10 bg-white p-4 shadow-lg shadow-violet/5">
        <h2 className="mb-2 px-1 text-lg font-bold text-indigo-deep">مخطط الدرس</h2>
        <ul className="space-y-0.5">
          {lesson.stations.map((s, i) => {
            const Icon = MODE_ICONS[s.mode];
            return (
              <li key={s.id}>
                <button
                  onClick={() => jump(`st-${i}`)}
                  className="relative flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-start transition hover:bg-violet/5"
                >
                  {s.review && (
                    <span
                      title="يحتاج مراجعة"
                      className="absolute -start-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-amber-500"
                    />
                  )}
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-violet/10 text-violet">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="truncate text-xs font-bold text-indigo-deep">{s.title}</span>
                </button>
                <button
                  onClick={() => jump(`ch-${i}`)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-start transition hover:bg-pink-card/5"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-pink-card/10 text-xs font-bold text-pink-card">
                    ت{i + 1}
                  </span>
                  <span className="truncate text-xs font-bold text-pink-card">{CHALLENGE_LABELS[s.challenge.kind]}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <button
          onClick={() => jump("boss")}
          className="mt-1.5 flex w-full items-center gap-2.5 rounded-xl bg-pink-card/10 px-2 py-2.5 text-start"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-pink-card text-white">
            <Lock className="size-3.5" />
          </span>
          <span className="text-xs font-bold text-pink-card">تحدّي الزعيم</span>
        </button>
      </nav>

      <aside className="rounded-3xl border border-mint/25 bg-mint/10 p-4">
        <h2 className="text-base font-bold text-emerald-800">جودة التوليد</h2>
        <p className="mt-1.5 text-xs font-medium leading-6 text-emerald-800/80">
          كل محطة وتحدٍّ مربوط بصفحته في ملفك. وما لا مصدر له لا يُولَّد.
        </p>
        <p className="mt-3 rounded-2xl bg-white px-3.5 py-3 text-xs font-semibold leading-6 text-indigo-deep">
          {pending === 0 ? "لا شيء يحتاج مراجعة. راجع المحتوى بنفسك قبل أن تشارك." : pending === 1 ? "محطة واحدة فيها ملاحظة تحتاج نظرتك." : `${pending} محطات فيها ملاحظات تحتاج نظرتك.`}
        </p>
      </aside>
    </div>
  );
}
