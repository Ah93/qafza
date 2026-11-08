"use client";

import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";
import { ANSWER_CARDS, type Group } from "@/lib/live";

const noop = () => () => {};

/** one printed sheet per group: A B C D, true, false, big enough to hold up across a classroom */
function Sheet({ groups }: { groups: Group[] }) {
  return (
    <div className="print-sheet" dir="rtl" aria-hidden>
      {groups.map((g) => (
        <section key={g.id} className="sheet-page">
          <p style={{ font: "bold 15pt Tahoma, Arial, sans-serif", margin: "0 0 4mm", color: "#1b0f3d" }}>
            بطاقات الإجابة · مجموعة {g.name}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6mm" }}>
            {ANSWER_CARDS.map((c) => (
              <div
                key={c.label}
                style={{
                  height: "78mm",
                  background: c.color,
                  color: "#fff",
                  borderRadius: "8mm",
                  display: "grid",
                  placeItems: "center",
                  font: "bold 96pt Tahoma, Arial, sans-serif",
                  border: "1.5mm dashed rgba(255,255,255,.85)",
                  outline: `0.6mm solid ${c.color}`,
                  outlineOffset: "-0.6mm",
                }}
              >
                {c.label}
              </div>
            ))}
          </div>
          <p style={{ font: "10pt Tahoma, Arial, sans-serif", marginTop: "5mm", color: "#555" }}>قصّ البطاقات على الخط المتقطّع. ترفع المجموعة بطاقتها بعد التشاور.</p>
        </section>
      ))}
    </div>
  );
}

/** the button and its print-only sheet (rendered straight under <body> so the rest of the page can be hidden when printing) */
export function PrintAnswerCards({ groups }: { groups: Group[] }) {
  const ready = useSyncExternalStore(noop, () => true, () => false);
  return (
    <>
      <button onClick={() => window.print()} className="mt-3 w-full rounded-xl border border-violet/10 bg-white py-2.5 text-xs font-bold text-violet transition hover:border-violet/30">
        اطبع بطاقات الإجابة
      </button>
      {ready && createPortal(<Sheet groups={groups} />, document.body)}
    </>
  );
}
