"use client";

import { AlignLeft, ArrowLeft, type LucideIcon } from "lucide-react";

export const inputBase =
  "w-full rounded-2xl border border-violet/10 bg-white px-4 text-indigo-deep outline-none transition placeholder:text-indigo-deep/40 focus:border-violet focus:ring-4 focus:ring-violet/10";

export function SourceChip({ page }: { page: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/15 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
      <AlignLeft className="size-3" />
      المصدر: صفحة {page}
    </span>
  );
}

export function CardHead({
  icon: Icon,
  iconClass,
  children,
  page,
}: {
  icon: LucideIcon;
  iconClass: string;
  children: React.ReactNode;
  page: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-white ${iconClass}`}>
          <Icon className="size-[18px]" />
        </span>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
      <SourceChip page={page} />
    </div>
  );
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-bold text-indigo-deep/60">
      {children}
    </label>
  );
}

export function Arrow() {
  return <ArrowLeft className="size-3.5 shrink-0 text-violet/50" />;
}
