"use client";

import { Lock } from "lucide-react";
import type { BossItem } from "@/lib/lesson";
import { useFlow } from "../FlowProvider";

export function BossCard({ boss }: { boss: BossItem[] }) {
  const { setBoss } = useFlow();
  const patch = (i: number, p: Partial<BossItem>) => setBoss(boss.map((b, j) => (j === i ? { ...b, ...p } : b)));

  return (
    <section id="boss" className="scroll-mt-24 rounded-[26px] bg-pink-card/10 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-pink-card text-white">
          <Lock className="size-[18px]" />
        </span>
        <h2 className="text-lg font-bold text-[#a3124a]">تحدّي الزعيم: التقييم الختامي، بالموت المفاجئ</h2>
      </div>
      <ul className="mt-4 space-y-2.5">
        {boss.map((b, i) => (
          <li key={i} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
            <input
              value={b.statement}
              onChange={(e) => patch(i, { statement: e.target.value })}
              aria-label={`العبارة ${i + 1}`}
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-indigo-deep outline-none"
            />
            <button
              onClick={() => patch(i, { answer: !b.answer })}
              title="اضغط للتبديل بين صحيحة وخاطئة"
              className={`w-14 shrink-0 text-end text-xs font-bold ${b.answer ? "text-emerald-700" : "text-[#c0174f]"}`}
            >
              {b.answer ? "صحيحة" : "خاطئة"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
