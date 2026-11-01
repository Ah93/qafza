"use client";

import { useState } from "react";
import Link from "next/link";

export function AuthTabs({ active }: { active: "login" | "signup" }) {
  const tab = (on: boolean) =>
    `flex-1 rounded-full py-2.5 text-center text-xs font-bold transition ${
      on ? "bg-white text-indigo-deep shadow-md shadow-violet/15" : "text-indigo-deep/50"
    }`;
  return (
    <div className="flex gap-1 rounded-full bg-violet/10 p-1">
      <Link href="/login" className={tab(active === "login")}>
        تسجيل الدخول
      </Link>
      <Link href="/signup" className={tab(active === "signup")}>
        حساب جديد
      </Link>
    </div>
  );
}

const PROVIDERS = [
  { name: "Google", icon: "G", color: "text-blue-500" },
  { name: "Microsoft", icon: "▦", color: "text-orange-500" },
  { name: "Apple", icon: "", color: "text-black" },
];

export function SocialButtons() {
  const [note, setNote] = useState<string | null>(null);
  return (
    <>
      <div className="grid grid-cols-3 gap-2.5">
        {PROVIDERS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => setNote(`الدخول بـ ${p.name} قيد الإعداد، ويحتاج ربط حساب مطوّر مع ${p.name}. استخدم البريد الإلكتروني الآن.`)}
            className="flex items-center justify-center gap-2 rounded-2xl border border-violet/10 bg-white py-3 text-xs font-bold text-indigo-deep shadow-sm transition hover:border-violet/30"
          >
            <span className={`${p.color} text-sm`}>{p.icon}</span>
            {p.name}
          </button>
        ))}
      </div>
      {note && (
        <p role="status" className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-[11px] font-semibold leading-5 text-amber-900">
          {note}
        </p>
      )}
      <div className="relative my-5 text-center text-[11px] text-indigo-deep/50">
        <span className="absolute inset-x-0 top-1/2 h-px bg-violet/10" />
        <span className="relative bg-lavender px-3">أو بالبريد الإلكتروني</span>
      </div>
    </>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold leading-5 text-rose-700">
      {message}
    </p>
  );
}

export function Field({
  label,
  aside,
  children,
}: {
  label: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-bold text-indigo-deep">
        {label}
        {aside}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-2xl border border-violet/10 bg-white px-4 py-3 text-sm text-indigo-deep shadow-sm outline-none transition placeholder:text-indigo-deep/45 focus:border-violet focus:ring-4 focus:ring-violet/10";

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-full rounded-full bg-brand py-3.5 text-sm font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
