"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";
import { Logo } from "../Logo";
import { useFlow } from "../teacher/FlowProvider";

const TABS = [
  { href: "/gallery", label: "أنماط العرض" },
  { href: "/gallery/assessment", label: "أنماط التقييم" },
  { href: "/rules", label: "قواعد اللعب" },
];

export function GalleryHeader() {
  const path = usePathname();
  const { account, user } = useFlow();
  return (
    <header className="sticky top-0 z-30 border-b border-violet/5 bg-white/85 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-[1000px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-5">
        <div className="justify-self-start">
          <Logo />
        </div>
        <nav aria-label="المعارض" className="hidden rounded-full border border-violet/10 bg-white p-1 text-xs font-bold shadow-sm sm:flex">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={path === t.href ? "page" : undefined}
              className={`rounded-full px-4 py-2 transition ${path === t.href ? "bg-violet/10 text-violet" : "text-indigo-deep/55 hover:text-indigo-deep"}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        {account ? (
          <Link href="/dashboard" className="flex items-center gap-2.5 justify-self-end rounded-full transition hover:opacity-80">
            <span className="text-xs font-bold text-indigo-deep">لوحتي</span>
            <span aria-hidden className="grid size-9 place-items-center rounded-full bg-sun text-sm font-bold text-indigo-deep">{user.initial}</span>
          </Link>
        ) : (
          <Link href="/login" className="justify-self-end rounded-full border border-violet/10 bg-white px-4 py-1.5 text-xs font-bold text-indigo-deep shadow-sm transition hover:border-violet/30">
            الدخول
          </Link>
        )}
      </div>
    </header>
  );
}

export function PageTitle({
  eyebrow,
  tone = "violet",
  title,
  intro,
}: {
  eyebrow: string;
  tone?: "violet" | "pink";
  title: string;
  intro: string;
}) {
  return (
    <>
      <p className={`flex items-center gap-2 text-[11px] font-bold ${tone === "pink" ? "text-pink-card" : "text-violet"}`}>
        <span className={`size-2 rounded-full ${tone === "pink" ? "bg-pink-card" : "bg-violet"}`} />
        {eyebrow}
      </p>
      <h1 className="mt-1 text-[38px] font-bold leading-tight text-indigo-deep sm:text-[44px]">{title}</h1>
      <p className="mt-2 text-sm font-medium text-indigo-deep/65">{intro}</p>
    </>
  );
}

export function GalleryShell({
  eyebrow,
  tone = "violet",
  title,
  intro,
  children,
}: {
  eyebrow: string;
  tone?: "violet" | "pink";
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <GalleryHeader />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 py-8">
        <PageTitle eyebrow={eyebrow} tone={tone} title={title} intro={intro} />
        <div className="mt-6 grid gap-4 md:grid-cols-2">{children}</div>
      </main>
    </>
  );
}

export function ModeCard({
  icon,
  title,
  fits,
  launch,
  note,
  children,
}: {
  /** a rendered element: a server page cannot pass a component function to a client component */
  icon: React.ReactNode;
  title: string;
  fits: string;
  launch: boolean;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <article className="flex flex-col rounded-[28px] border border-violet/10 bg-white p-4 shadow-lg shadow-violet/5">
      <header className="flex items-start justify-between gap-3 px-1 pt-1">
        <div className="flex items-center gap-3">
          <span className="grid size-[52px] shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-md shadow-violet/25">
            {icon}
          </span>
          <div>
            <h2 className="text-[22px] font-bold leading-tight text-indigo-deep">{title}</h2>
            <p className="mt-0.5 text-[11px] font-medium text-indigo-deep/60">يناسب: {fits}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold ${launch ? "bg-mint/15 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {launch ? "عند الإطلاق" : "المرحلة التالية"}
        </span>
      </header>
      <div className="mt-3 flex-1">{children}</div>
      <p className="mt-3 flex items-center gap-2 rounded-2xl bg-violet/[0.04] px-3.5 py-3 text-[11px] font-medium leading-5 text-indigo-deep/75">
        <Zap className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
        {note}
      </p>
    </article>
  );
}

/** the dark, dotted stage every demo sits on */
export function Stage({ children, className = "", light }: { children: React.ReactNode; className?: string; light?: boolean }) {
  return (
    <div
      className={`relative min-h-[236px] overflow-hidden rounded-3xl p-4 ${
        light ? "bg-violet/[0.06] text-indigo-deep" : "dots bg-gradient-to-br from-[#1b0f3d] to-[#5b21b6] text-white"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ---------- the cell-parts map, shared by "interactive diagram" and "tap on the image" ---------- */

export const PARTS = [
  { id: "shape", label: "الشكل المقعّر", x: 52, y: 12, text: "قرص مقعّر من الجانبين يزيد مساحة السطح لتبادل الأكسجين." },
  { id: "membrane", label: "الغشاء المرن", x: 73, y: 27, text: "غشاء مرن يسمح للخلية بالمرور في الشعيرات الضيقة." },
  { id: "size", label: "الحجم الصغير", x: 32, y: 27, text: "نحو 7 إلى 8 ميكرومترات، يناسب أضيق الأوعية." },
  { id: "hemo", label: "الهيموغلوبين", x: 73, y: 56, text: "بروتين فيه حديد يحمل الأكسجين." },
  { id: "nucleus", label: "غياب النواة", x: 32, y: 56, text: "يفسح مكانًا أكبر للهيموغلوبين." },
  { id: "cyto", label: "السيتوبلازم", x: 52, y: 71, text: "سائل الخلية الذي يحمل الهيموغلوبين." },
] as const;

export type PartId = (typeof PARTS)[number]["id"];

export function PartsMap({
  selected,
  onPick,
  state,
}: {
  selected?: PartId | null;
  onPick: (id: PartId) => void;
  /** per part: "right" | "wrong" feedback after answering */
  state?: Partial<Record<PartId, "right" | "wrong">>;
}) {
  return (
    <div className="relative h-[190px]" dir="ltr">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
        {PARTS.map((p) => (
          <line key={p.id} x1="52" y1="41" x2={p.x} y2={p.y} stroke="rgba(255,255,255,.28)" strokeWidth="0.6" strokeDasharray="1.6 1.6" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <span className="absolute left-[52%] top-[41%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-gradient-to-r from-violet to-magenta px-3.5 py-2 text-center text-[13px] font-bold leading-4 text-white shadow-lg" dir="rtl">
        خلية الدم
        <br />
        الحمراء
      </span>
      {PARTS.map((p) => {
        const st = state?.[p.id];
        const on = selected === p.id;
        return (
          <button
            key={p.id}
            dir="rtl"
            onClick={() => onPick(p.id)}
            aria-pressed={on}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-bold shadow-md transition ${
              st === "right"
                ? "bg-mint text-white ring-4 ring-mint/30"
                : st === "wrong"
                  ? "bg-rose-500 text-white ring-4 ring-rose-400/30"
                  : on
                    ? "bg-sun text-indigo-deep ring-4 ring-sun/30"
                    : "bg-white text-indigo-deep hover:bg-violet-50"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
