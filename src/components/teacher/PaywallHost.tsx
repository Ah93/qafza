"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PAYWALL_EVENT, trackEvent } from "@/lib/client-api";
import { PRICES, money } from "@/lib/pricing";

/** The "free lesson used" dialog. Mounted once; any 402 from the API opens it (see client-api.ts). */
export function PaywallHost() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = () => {
      setOpen(true);
      trackEvent("upgrade_viewed");
    };
    window.addEventListener(PAYWALL_EVENT, on);
    return () => window.removeEventListener(PAYWALL_EVENT, on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-indigo-deep/40 p-5 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="paywall-title" className="w-full max-w-[460px] animate-[pop_.3s_ease-out] rounded-[28px] bg-white p-7 shadow-2xl shadow-indigo-deep/30">
        <span className="inline-block rounded-full bg-mint/15 px-3.5 py-1.5 text-xs font-bold text-emerald-700">اكتمل درسك المجاني</span>
        <h2 id="paywall-title" className="mt-4 text-[26px] font-bold leading-snug text-indigo-deep">لدرسك الثاني وكل ما بعده، اشترك في قفزة الكاملة.</h2>
        <p className="mt-3 text-xs font-medium leading-6 text-indigo-deep/70">دروسك السابقة وحصصك ونتائجك تبقى كما هي، وطلابك يلعبون مجانًا دائمًا.</p>
        <p className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-indigo-deep">{money("usd", PRICES.usd.monthly)}</span>
          <span className="text-xs font-semibold text-indigo-deep/70">شهريًا · أو وفّر بخطة العام الدراسي</span>
        </p>
        <div className="mt-5 flex items-center gap-3">
          <Link href="/pricing" data-autofocus onClick={() => { trackEvent("upgrade_clicked"); setOpen(false); }} className="flex-1 rounded-full bg-brand py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110">
            اشترك الآن
          </Link>
          <button onClick={() => setOpen(false)} className="rounded-full border border-violet/15 bg-white px-6 py-3.5 text-xs font-bold text-violet">
            لاحقًا
          </button>
        </div>
      </div>
    </div>
  );
}
