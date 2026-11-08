"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => {
        const on = open === i;
        return (
          <li key={it.q} className="rounded-3xl border border-violet/10 bg-white shadow-sm">
            <h2>
              <button
                aria-expanded={on}
                aria-controls={`faq-${i}`}
                onClick={() => setOpen(on ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start text-sm font-bold text-indigo-deep"
              >
                {it.q}
                <ChevronDown className={`size-4 shrink-0 text-violet transition ${on ? "rotate-180" : ""}`} />
              </button>
            </h2>
            {on && (
              <p id={`faq-${i}`} className="px-5 pb-5 text-sm font-medium leading-7 text-indigo-deep/75">
                {it.a}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
