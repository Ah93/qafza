"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChartColumn, Check, House, User, Users } from "lucide-react";
import { MobileNav } from "../MobileNav";
import { Logo } from "../Logo";
import { useFlow } from "./FlowProvider";

function Avatar() {
  const { user } = useFlow();
  return (
    <Link href="/account" aria-label="حسابي" className="flex items-center gap-2.5 rounded-full transition hover:opacity-80">
      <span className="hidden text-xs font-bold text-indigo-deep sm:inline">{user.name}</span>
      <span className="grid size-9 place-items-center rounded-full bg-sun text-sm font-bold text-indigo-deep">
        {user.initial}
      </span>
    </Link>
  );
}

const NAV = [
  { href: "/dashboard", label: "الرئيسية" },
  { href: "/lessons", label: "دروسي" },
  { href: "/classes", label: "صفوفي" },
  { href: "/results", label: "النتائج" },
  { href: "/pricing", label: "الاشتراك" },
];

/** Header of every teacher screen outside the lesson-creation flow. */
export function TeacherHeader() {
  const path = usePathname();
  return (
    <>
    <header className="sticky top-0 z-30 border-b border-violet/5 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-5">
        <Logo href="/dashboard" />

        <div className="hidden items-center gap-3 md:flex">
          <div className="flex rounded-full border border-violet/10 bg-white p-1 text-xs font-bold shadow-sm">
            <span className="rounded-full bg-indigo-deep px-4 py-2 text-white">أعلّم</span>
            <Link href="/learn" className="rounded-full px-4 py-2 text-indigo-deep/70">
              أتعلّم
            </Link>
          </div>
          <nav className="flex rounded-full border border-violet/10 bg-white p-1 text-xs font-bold shadow-sm">
            {NAV.map((n) => {
              const on = path === n.href || path.startsWith(n.href + "/");
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`rounded-full px-4 py-2 transition ${
                    on ? "bg-violet/10 text-violet" : "text-indigo-deep/70 hover:text-indigo-deep"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <Avatar />
      </div>
    </header>
    <MobileNav
      label="التنقّل الرئيسي"
      items={[
        { href: "/dashboard", label: "الرئيسية", icon: House },
        { href: "/lessons", label: "دروسي", icon: BookOpen },
        { href: "/classes", label: "صفوفي", icon: Users },
        { href: "/results", label: "النتائج", icon: ChartColumn },
        { href: "/account", label: "حسابي", icon: User },
      ]}
    />
    </>
  );
}

const STEPS = ["ارفع", "خصّص", "راجع", "شارك"] as const;

/** Header of the creation flow: upload → customise → review → share. `current` is 1-based (2 = customise). */
export function FlowHeader({ current }: { current: 2 | 3 | 4 }) {
  return (
    <header className="sticky top-0 z-30 border-b border-violet/5 bg-white/85 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-[1240px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-5">
        <div className="justify-self-start">
          <Logo href="/dashboard" compact />
        </div>

        <ol
          aria-label="خطوات إنشاء الدرس"
          className="flex items-center gap-1 rounded-full border border-violet/10 bg-white p-1 shadow-sm"
        >
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < current;
            const on = n === current;
            return (
              <li key={label} className="flex items-center gap-1" aria-current={on ? "step" : undefined}>
                {i > 0 && <span className="hidden h-px w-4 bg-violet/15 sm:block" />}
                <span
                  className={`flex items-center gap-2 rounded-full py-1.5 ps-3 pe-2 text-xs font-bold ${
                    on ? "bg-violet/10 text-violet" : done ? "text-emerald-700" : "text-indigo-deep/70"
                  }`}
                >
                  <span className="hidden sm:inline">{label}</span>
                  <span
                    className={`grid size-6 place-items-center rounded-full text-xs ${
                      on
                        ? "bg-violet text-white"
                        : done
                          ? "bg-mint text-white"
                          : "bg-violet/10 text-indigo-deep/70"
                    }`}
                  >
                    {done ? <Check className="size-3.5" strokeWidth={3} /> : n}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="justify-self-end">
          <Avatar />
        </div>
      </div>
    </header>
  );
}
