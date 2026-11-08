"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, postJson } from "@/lib/client-api";
import { METHODS, PLAN_DAYS, money, type Currency, type PayMethod, type PlanId } from "@/lib/pricing";
import { Logo } from "../../Logo";

type Info = { plan: PlanId; currency: Currency; method: PayMethod; amount: number; status: string };

/** The stand-in payment window used while no real provider is connected. It never takes money. */
export function TestCheckout() {
  const router = useRouter();
  const session = useSearchParams().get("session") ?? "";
  const [info, setInfo] = useState<Info | null>(null);
  const [test, setTest] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    api<{ checkout: Info; test: boolean }>(`/api/billing/checkout?session=${encodeURIComponent(session)}`).then((r) => {
      if (!live) return;
      if (r.ok) {
        setInfo(r.data.checkout);
        setTest(r.data.test);
      } else setError(r.error);
    });
    return () => {
      live = false;
    };
  }, [session]);

  async function finish(paid: boolean) {
    setBusy(true);
    const r = await postJson("/api/billing/test/complete", { session, paid });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    router.push(paid ? "/pricing?paid=1" : "/pricing");
  }

  const method = METHODS.find((m) => m.id === info?.method)?.label ?? "";
  return (
    <>
      <header className="border-b border-violet/5 bg-white/80">
        <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between px-5">
          <Logo href="/pricing" />
          <span className="text-xs font-bold text-indigo-deep/70">دفع آمن</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[460px] flex-1 px-5 py-10">
        <section className="rounded-[28px] border border-violet/10 bg-white p-7 shadow-xl shadow-violet/5">
          {test && <p className="mb-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold leading-6 text-amber-900">بوابة دفع تجريبية: لا يُسحب أي مال.</p>}
          {error && <p role="alert" className="text-sm font-bold text-[#c0174f]">{error}</p>}
          {!info && !error && <p role="status" className="text-sm font-bold text-indigo-deep/70">جارٍ فتح الدفع…</p>}
          {info && (
            <>
              <h1 className="text-2xl font-bold text-indigo-deep">قفزة الكاملة</h1>
              <p className="mt-1 text-xs font-medium text-indigo-deep/70">{info.plan === "monthly" ? "شهري" : "العام الدراسي"} · {PLAN_DAYS[info.plan]} يومًا · {method}</p>
              <p className="mt-4 text-[40px] font-bold leading-none text-indigo-deep">{money(info.currency, info.amount)}</p>
              {info.status !== "pending" ? (
                <p role="status" className="mt-5 text-sm font-bold text-indigo-deep/70">عملية الدفع هذه انتهت.</p>
              ) : (
                <div className="mt-6 flex gap-2.5">
                  <button disabled={busy} onClick={() => finish(true)} className="flex-1 rounded-full bg-brand py-3.5 text-sm font-bold text-white shadow-lg shadow-violet/30 disabled:opacity-60">
                    أكمل الدفع
                  </button>
                  <button disabled={busy} onClick={() => finish(false)} className="rounded-full border border-violet/15 px-6 py-3.5 text-xs font-bold text-violet disabled:opacity-60">
                    ألغِ
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </>
  );
}
