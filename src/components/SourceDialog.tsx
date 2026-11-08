"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/client-api";

type Passage = { source: string; page: number; pages: number; sentences: string[]; hit: number; prev: string; next: string };

/** the original passage a station came from: the page number, the matching sentence highlighted, a line before and after */
export function SourceDialog({ from, page, query, onClose }: { from: { id?: string; code?: string }; page: number; query: string; onClose: () => void }) {
  const [data, setData] = useState<Passage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mark = useRef<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let live = true;
    const qs = new URLSearchParams({ page: String(page), q: query });
    if (from.id) qs.set("id", from.id);
    else if (from.code) qs.set("code", from.code);
    api<Passage>(`/api/source?${qs}`).then((r) => {
      if (!live) return;
      if (r.ok) setData(r.data);
      else setError(r.error);
    });
    return () => {
      live = false;
    };
  }, [from.id, from.code, page, query]);

  useEffect(() => {
    closeBtn.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  useEffect(() => {
    mark.current?.scrollIntoView({ block: "center" });
  }, [data]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-indigo-deep/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="المقطع الأصلي من المصدر" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-[560px] flex-col rounded-[28px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-emerald-700">من المصدر الأصلي</p>
            <h2 className="mt-0.5 text-lg font-bold text-indigo-deep">صفحة {page}{data ? ` من ${data.pages}` : ""}</h2>
            {data?.source && <p className="mt-0.5 text-xs font-medium text-indigo-deep/70">{data.source}</p>}
          </div>
          <button ref={closeBtn} onClick={onClose} aria-label="أغلق" className="grid size-11 shrink-0 place-items-center rounded-full bg-violet/10 text-violet">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-2xl bg-lavender p-4 text-[15px] font-medium leading-8 text-indigo-deep">
          {error && <p role="alert" className="font-bold text-rose-800">{error}</p>}
          {!data && !error && <p role="status">جارٍ التحميل…</p>}
          {data && (
            <>
              {data.hit < 0 && <p className="mb-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-indigo-deep/70">لم نحدّد الجملة بدقّة، فهذه الصفحة كاملة.</p>}
              {data.sentences.map((s, i) =>
                i === data.hit ? (
                  <mark key={i} ref={(el) => { mark.current = el; }} className="rounded-md bg-sun px-1 py-0.5 font-bold text-indigo-deep">
                    {s}{" "}
                  </mark>
                ) : (
                  <span key={i} className={data.hit >= 0 && Math.abs(i - data.hit) > 2 ? "text-indigo-deep/70" : ""}>
                    {s}{" "}
                  </span>
                ),
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
