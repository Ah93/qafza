"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Presentation, Trophy, House } from "lucide-react";
import { MobileNav } from "../MobileNav";
import { Logo } from "../Logo";
import { useSyncExternalStore } from "react";
import { calmOn, setCalm, setSound, soundOn, subscribeSound } from "@/lib/sound";
import { useStudent } from "./StudentProvider";

/** the sound on/off switch (remembered on this device) */
export function SoundToggle() {
  const on = useSyncExternalStore(subscribeSound, soundOn, () => true);
  return (
    <button
      onClick={() => setSound(!on)}
      aria-pressed={on}
      aria-label={on ? "أوقف الصوت" : "شغّل الصوت"}
      className="grid size-9 place-items-center rounded-full border border-violet/10 bg-white text-base shadow-sm transition hover:border-violet/30"
    >
      <span aria-hidden>{on ? "🔊" : "🔇"}</span>
    </button>
  );
}

/** calm motion: stops animations and vibration (also on by default for people whose device asks for reduced motion) */
export function MotionToggle() {
  const calm = useSyncExternalStore(subscribeSound, calmOn, () => false);
  return (
    <button
      onClick={() => setCalm(!calm)}
      aria-pressed={calm}
      aria-label="حركة هادئة"
      title="حركة هادئة"
      className={`grid size-9 place-items-center rounded-full border text-base shadow-sm transition ${calm ? "border-violet bg-violet/10" : "border-violet/10 bg-white hover:border-violet/30"}`}
    >
      <span aria-hidden>🍃</span>
    </button>
  );
}

export function PlayerAvatar({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-[34%] bg-pink-500 shadow-sm"
      style={{ width: size, height: size }}
    />
  );
}

export function Hearts({ n, max = 3, size = "size-4" }: { n: number; max?: number; size?: string }) {
  return (
    <span className="flex gap-1" role="img" aria-label={`${n} من ${max} قلوب`}>
      {Array.from({ length: max }, (_, i) => (
        <Heart key={i} className={`${size} transition ${i < n ? "fill-rose-500 text-rose-500" : "fill-transparent text-rose-200"}`} />
      ))}
    </span>
  );
}

export function Flame({ n }: { n: number }) {
  return (
    <span className="flex items-center gap-1 text-xs font-bold text-orange-500">
      <span aria-hidden>🔥</span>
      {n}
    </span>
  );
}

const NAV = [
  { href: "/learn", label: "مساحتي" },
  { href: "/learn/profile", label: "سجلّي" },
];

/** header of the student's own space (home, profile) */
export function LearnHeader() {
  const path = usePathname();
  const { name } = useStudent();
  return (
    <>
    <header className="sticky top-0 z-30 border-b border-violet/5 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between gap-4 px-5">
        <Logo href="/learn" />
        <div className="hidden items-center gap-3 md:flex">
          <div className="flex rounded-full border border-violet/10 bg-white p-1 text-xs font-bold shadow-sm">
            <Link href="/dashboard" className="rounded-full px-4 py-2 text-indigo-deep/70">
              أعلّم
            </Link>
            <span className="rounded-full bg-indigo-deep px-4 py-2 text-white">أتعلّم</span>
          </div>
          <nav className="flex rounded-full border border-violet/10 bg-white p-1 text-xs font-bold shadow-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={path === n.href ? "page" : undefined}
                className={`rounded-full px-4 py-2 transition ${
                  path === n.href ? "bg-pink-50 text-pink-700" : "text-indigo-deep/70 hover:text-indigo-deep"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <Link href="/learn/profile" className="flex items-center gap-2.5 rounded-full transition hover:opacity-80" aria-label="سجلّي">
          <span className="text-xs font-bold text-indigo-deep">{name}</span>
          <PlayerAvatar size={30} />
        </Link>
      </div>
    </header>
    <MobileNav
      label="التنقّل الرئيسي"
      items={[
        { href: "/learn", label: "مساحتي", icon: House },
        { href: "/learn/profile", label: "سجلّي", icon: Trophy },
        { href: "/dashboard", label: "أعلّم", icon: Presentation },
      ]}
    />
    </>
  );
}

/** header while playing: logo on one side, chips on the other, optional centred title */
export function PlayHeader({ title, children }: { title?: string; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-violet/5 bg-white/85 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-[1100px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-5">
        <div className="justify-self-start">
          <Logo href="/learn" />
        </div>
        <p className="hidden truncate text-sm font-bold text-indigo-deep sm:block">{title}</p>
        <div className="flex items-center gap-2.5 justify-self-end">
          {children}
          <SoundToggle />
          <MotionToggle />
        </div>
      </div>
    </header>
  );
}

export function NamePill({ group }: { group?: { name: string; color: string } | null }) {
  const { name } = useStudent();
  return group ? (
    <span className="flex items-center gap-2 rounded-full border-2 border-pink-400 bg-white px-4 py-1.5 text-xs font-bold text-pink-700">
      <span className="size-2.5 rounded-[3px]" style={{ background: group.color }} />
      {name} · مجموعة {group.name}
    </span>
  ) : (
    <span className="flex items-center gap-2 rounded-full border border-violet/10 bg-white py-1 pe-4 ps-1.5 text-xs font-bold text-indigo-deep shadow-sm">
      <PlayerAvatar size={26} />
      {name}
    </span>
  );
}
