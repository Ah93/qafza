"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/client-api";
import { fmtDate } from "@/lib/format";
import { money } from "@/lib/pricing";
import type { Invoice } from "@/lib/server/invoices";
import { TeacherHeader } from "../TeacherHeader";

/** the invoice on screen; "حفظ PDF" opens the browser's print dialog, where "Save as PDF" is one click (the page prints on its own, without the menus) */
export function InvoiceView() {
  const id = String(useParams<{ id: string }>().id ?? "");
  const [inv, setInv] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api<{ invoice: Invoice }>(`/api/billing/invoices/${id}`).then((r) => {
      if (!live) return;
      if (r.ok) setInv(r.data.invoice);
      else setError(r.error);
    });
    return () => {
      live = false;
    };
  }, [id]);

  const row = "flex items-center justify-between gap-4 border-b border-violet/[0.08] py-3 text-sm";
  return (
    <>
      <div className="print:hidden">
        <TeacherHeader />
      </div>
      <main className="mx-auto w-full max-w-[720px] flex-1 px-5 py-7 print:max-w-none print:p-0">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link href="/account" className="text-[11px] font-bold text-violet underline underline-offset-4">
            ← حسابي
          </Link>
          {inv && (
            <button onClick={() => window.print()} className="rounded-full bg-brand px-7 py-2.5 text-xs font-bold text-white shadow-md shadow-violet/30">
              حفظ PDF
            </button>
          )}
        </div>
        {error && <p role="alert" className="rounded-2xl bg-rose-50 px-5 py-4 text-sm font-bold text-rose-800">{error}</p>}
        {!inv && !error && <p role="status" className="text-sm font-bold text-indigo-deep/60">جارٍ التحميل…</p>}
        {inv && (
          <article className="rounded-3xl border border-violet/10 bg-white p-7 shadow-sm print:border-0 print:shadow-none">
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-2xl font-bold text-violet">قفزة</p>
                <h1 className="mt-1 text-xl font-bold text-indigo-deep">{inv.kind === "tax" ? "فاتورة ضريبية" : "إيصال دفع"}</h1>
                {inv.kind === "receipt" && <p className="mt-1 text-[11px] font-semibold text-amber-700">هذا إيصال وليس فاتورة ضريبية.</p>}
              </div>
              <div className="text-end text-xs font-semibold leading-6 text-indigo-deep/70">
                <p>
                  الرقم: <b dir="ltr" className="text-indigo-deep">{inv.number}</b>
                </p>
                <p>التاريخ: {fmtDate(inv.issuedAt, { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            </header>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <section>
                <h2 className="text-[11px] font-bold text-indigo-deep/50">البائع</h2>
                {inv.seller ? (
                  <p className="mt-1 text-sm font-semibold leading-7 text-indigo-deep">
                    {inv.seller.name}
                    <br />
                    الرقم الضريبي: <span dir="ltr">{inv.seller.vatNumber}</span>
                    {inv.seller.address && (
                      <>
                        <br />
                        {inv.seller.address}
                      </>
                    )}
                  </p>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-indigo-deep">قفزة</p>
                )}
              </section>
              <section>
                <h2 className="text-[11px] font-bold text-indigo-deep/50">العميل</h2>
                <p className="mt-1 text-sm font-semibold leading-7 text-indigo-deep">
                  {inv.customer.name}
                  <br />
                  <span dir="ltr">{inv.customer.email}</span>
                </p>
              </section>
            </div>

            <div className="mt-6">
              <div className={row}>
                <span className="font-bold text-indigo-deep">قفزة الكاملة · {inv.plan === "year" ? "العام الدراسي" : "شهري"} ({inv.days} يومًا)</span>
                <span className="font-bold text-indigo-deep">{money(inv.currency, inv.net)}</span>
              </div>
              {inv.vatRate > 0 && (
                <div className={row}>
                  <span className="font-semibold text-indigo-deep/75">ضريبة القيمة المضافة ({inv.vatRate}%)</span>
                  <span className="font-semibold text-indigo-deep/75">{money(inv.currency, inv.vat)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 pt-4 text-lg font-bold text-indigo-deep">
                <span>الإجمالي{inv.vatRate > 0 ? " شامل الضريبة" : ""}</span>
                <span>{money(inv.currency, inv.total)}</span>
              </div>
            </div>
          </article>
        )}
      </main>
    </>
  );
}
