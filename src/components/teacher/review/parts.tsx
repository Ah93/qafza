"use client";

import { useState } from "react";
import { AlignLeft, ArrowLeft, type LucideIcon } from "lucide-react";
import { SourceDialog } from "@/components/SourceDialog";

export const inputBase =
  "w-full rounded-2xl border border-violet/10 bg-white px-4 text-indigo-deep outline-none transition placeholder:text-indigo-deep/65 focus:border-violet focus:ring-4 focus:ring-violet/10";

export type SourceRef = { id?: string; code?: string; query: string };

/** "المصدر: صفحة N"; with a lesson to look in, it opens the original passage with the station's sentence highlighted */
export function SourceChip({ page, from }: { page: number; from?: SourceRef }) {
  const [open, setOpen] = useState(false);
  const cls = "inline-flex items-center gap-1.5 rounded-full bg-mint/15 px-3 py-1.5 text-xs font-bold text-emerald-800";
  if (!from || (!from.id && !from.code)) {
    return (
      <span className={cls}>
        <AlignLeft className="size-3" />
        المصدر: صفحة {page}
      </span>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={`${cls} min-h-9 transition hover:bg-mint/25`}>
        <AlignLeft className="size-3" />
        المصدر: صفحة {page}
      </button>
      {open && <SourceDialog from={from} page={page} query={from.query} onClose={() => setOpen(false)} />}
    </>
  );
}

export function CardHead({
  icon: Icon,
  iconClass,
  children,
  page,
  from,
}: {
  icon: LucideIcon;
  iconClass: string;
  children: React.ReactNode;
  page: number;
  from?: SourceRef;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-white ${iconClass}`}>
          <Icon className="size-[18px]" />
        </span>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
      <SourceChip page={page} from={from} />
    </div>
  );
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold text-indigo-deep/70">
      {children}
    </label>
  );
}

export function Arrow() {
  return <ArrowLeft className="size-3.5 shrink-0 text-violet/75" />;
}
