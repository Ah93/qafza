"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { TeacherHeader } from "../TeacherHeader";
import { useFlow } from "../FlowProvider";
import { postJson } from "@/lib/client-api";
import { CURRENCIES, METHODS, PRICES, methodsFor, money, type Currency, type PayMethod, type PlanId } from "@/lib/pricing";
import { dateAr, usePlan } from "../usePlan";
import { useToast } from "../Toast";
import { Chip, Eyebrow, Label, fieldCls } from "../ui";

const FEATURES = [
  ["دروس بلا حد", "كل أنماط العرض والتقييم"],
  ["الحصة المباشرة والمجموعات", "نتائج وفجوات فهم"],
  ["المكتبة والنسخ", "طلابك يلعبون مجانًا"],
];

const ORG_KINDS = ["مدرسة", "جامعة أو كلية", "معهد أو مركز تدريب", "جهة حكومية", "شركة"];
const START = ["هذا الفصل", "الفصل القادم", "العام القادم", "نستكشف فقط"];

export function PricingView() {
  const { user } = useFlow();
  const { plan: status } = usePlan();
  const justPaid = useSearchParams().get("paid") === "1";
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const [currency, setCurrency] = useState<Currency>("usd");
  const [plan, setPlan] = useState<PlanId>("monthly");
  const [chosen, setMethod] = useState<PayMethod>("mada");
  const [kind, setKind] = useState(ORG_KINDS[0]);
  const [when, setWhen] = useState(START[0]);
  const [sent, setSent] = useState(false);

  const price = PRICES[currency];
  const amount = price[plan];
  const perMonth = Math.round(price.year / 12);
  const sym = (n: number) => money(currency, n);
  const allowed = methodsFor(currency);
  const method = allowed.includes(chosen) ? chosen : allowed[0];
  const methodWindow = METHODS.find((m) => m.id === method)!.window;
  const [payError, setPayError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setPayError(null);
    const r = await postJson<{ url: string }>("/api/billing/checkout", { plan, currency, method });
    if (!r.ok) {
      setBusy(false);
      return setPayError(r.error);
    }
    window.location.href = r.data.url;
  }

  return (
    <>
      <TeacherHeader />
      <main className="mx-auto w-full max-w-[860px] flex-1 px-5 py-8">
        {status?.open && (
          <p role="status" className="mb-4 rounded-2xl bg-mint/15 px-5 py-3 text-xs font-bold leading-6 text-emerald-900">
            الدروس مفتوحة للجميع حاليًا: أنشئ دروسًا بلا حد. سنعلن هنا حين تُفتح الاشتراكات.
          </p>
        )}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>الاشتراك</Eyebrow>
            <h1 className="mt-1 text-[36px] font-bold leading-tight text-indigo-deep">سعر واحد، يفتح كل شيء</h1>
          </div>
          <div role="radiogroup" aria-label="العملة" className="flex rounded-full bg-violet/10 p-1">
            {CURRENCIES.map((c) => (
              <button
                key={c.id}
                role="radio"
                aria-checked={currency === c.id}
                onClick={() => setCurrency(c.id)}
                className={`rounded-full px-4 py-2 text-[11px] font-bold transition ${
                  currency === c.id ? "bg-white text-indigo-deep shadow-sm" : "text-indigo-deep/55 hover:text-indigo-deep"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid items-stretch gap-4 md:grid-cols-[1fr_1.35fr]">
          <section className="rounded-3xl border border-violet/10 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-indigo-deep">التجربة المجانية</h2>
              {status && (
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${status.lessonsCreated >= status.freeLimit ? "bg-mint/15 text-emerald-700" : "bg-violet/10 text-violet"}`}>
                  {status.lessonsCreated >= status.freeLimit ? "استُخدمت" : "متاحة"}
                </span>
              )}
            </div>
            <p className="mt-1 text-[40px] font-bold leading-tight text-indigo-deep">مجانًا</p>
            <p className="mt-3 text-xs font-medium leading-6 text-indigo-deep/65">
              درس واحد كامل بكل المزايا: الحصة المباشرة والمجموعات والنتائج. وطلابك يلعبون مجانًا دائمًا.
            </p>
          </section>

          <section className="dots relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-deep to-[#4a1d96] p-6 text-white shadow-xl shadow-indigo-deep/25">
            <div className="relative flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold">قفزة الكاملة</h2>
              <div role="radiogroup" aria-label="مدة الاشتراك" className="flex rounded-full bg-white/10 p-1">
                {([
                  ["monthly", "شهري"],
                  ["year", "العام الدراسي"],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    role="radio"
                    aria-checked={plan === id}
                    onClick={() => setPlan(id)}
                    className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold transition ${
                      plan === id ? "bg-white text-indigo-deep" : "text-white/75 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <p className="relative mt-3 flex items-baseline gap-2">
              <span className="text-[44px] font-bold leading-none">{sym(amount)}</span>
              <span className="text-xs font-semibold text-white/80">{plan === "monthly" ? "شهريًا" : "للعام الدراسي"}</span>
            </p>
            <p className="relative mt-2 text-xs font-bold text-sun">
              {plan === "monthly" ? "ألغِ متى شئت" : `أي نحو ${sym(perMonth)} شهريًا`}
            </p>

            <ul className="relative mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs font-semibold">
              {FEATURES.flatMap((row) => row).map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="grid size-4 shrink-0 place-items-center rounded-full bg-sun text-indigo-deep">
                    <Check className="size-2.5" strokeWidth={4} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-4 rounded-3xl border border-violet/10 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-indigo-deep">الدفع</h2>
          <div role="radiogroup" aria-label="طريقة الدفع" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {METHODS.filter((m) => allowed.includes(m.id)).map((m) => (
              <button
                key={m.id}
                role="radio"
                aria-checked={method === m.id}
                onClick={() => setMethod(m.id)}
                className={`rounded-2xl border py-3.5 text-xs font-bold transition ${
                  method === m.id
                    ? "border-violet border-2 bg-violet/10 text-violet"
                    : "border-violet/10 bg-white text-indigo-deep hover:border-violet/30"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-3 rounded-2xl bg-violet/[0.05] px-4 py-3.5 text-xs font-medium text-indigo-deep/75">
            ستُكمل الدفع في نافذة {methodWindow} الآمنة.
          </p>
          {status?.payments === "test" && (
            <p className="mt-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-[11px] font-semibold leading-6 text-amber-900">
              وضع التجربة: بوابة الدفع تجريبية ولا يُسحب أي مال. تُفعَّل البوابة الحقيقية عند ربط مزوّد الدفع.
            </p>
          )}
          {status?.payments === "off" && (
            <p role="status" className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-[11px] font-semibold leading-6 text-amber-900">
              الدفع الإلكتروني قريبًا. <a href="#contact" className="font-bold text-violet underline underline-offset-4">تواصل معنا لتفعيل اشتراكك</a>.
            </p>
          )}
          {justPaid && status?.entitled && (
            <p role="status" className="mt-3 rounded-2xl bg-mint/15 px-4 py-3 text-xs font-bold text-emerald-900">تم الدفع. أنت مشترك في قفزة الكاملة حتى {dateAr(status.until!)}.</p>
          )}
          {payError && <p role="alert" className="mt-3 text-xs font-bold text-[#c0174f]">{payError}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-violet/10 pt-4">
            <div>
              <p className="text-sm font-bold text-indigo-deep">قفزة الكاملة · {plan === "monthly" ? "شهري (30 يومًا)" : "العام الدراسي (365 يومًا)"}</p>
              <p className="mt-0.5 text-[11px] font-medium text-indigo-deep/55">
                {status?.entitled ? `اشتراكك ساري حتى ${dateAr(status.until!)}. الدفع الآن يمدّده.` : "دفعة واحدة، بلا تجديد تلقائي."}
              </p>
            </div>
            <button
              onClick={pay}
              disabled={busy || !status || status.payments === "off"}
              className="rounded-full bg-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110 disabled:opacity-60"
            >
              {busy ? "جارٍ التحويل…" : status?.payments === "off" ? "قريبًا" : status?.entitled ? `جدّد ${sym(amount)}` : `ادفع ${sym(amount)}`}
            </button>
          </div>
        </section>

        <section id="contact" className="mt-4 scroll-mt-24 rounded-3xl border border-violet/10 bg-white p-6 shadow-sm">
          {sent ? (
            <div className="py-10 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-mint text-white">
                <Check className="size-6" strokeWidth={3} />
              </span>
              <h2 className="mt-4 text-2xl font-bold text-indigo-deep">وصل طلبك</h2>
              <p className="mt-2 text-xs font-medium text-indigo-deep/65">نعود إليك بعرض خاص قريبًا، على البريد الذي كتبته.</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="space-y-3"
            >
              <h2 className="text-2xl font-bold text-indigo-deep">للمؤسسات: تواصل معنا</h2>
              <p className="text-xs font-medium text-indigo-deep/60">
                مدرسة أو معهد أو جامعة أو قسم تدريب. نعود إليك بعرض خاص.
              </p>

              <div className="grid gap-3 pt-1 sm:grid-cols-2">
                <input aria-label="الاسم" required defaultValue={user.name} className={fieldCls} />
                <input aria-label="المسمّى الوظيفي" placeholder="مثال: مدير المدرسة" className={fieldCls} />
                <input aria-label="البريد الإلكتروني" required type="email" dir="ltr" placeholder="name@school.edu.sa" className={`${fieldCls} text-start`} />
                <input aria-label="رقم الجوال" type="tel" dir="ltr" placeholder="+966" className={`${fieldCls} text-start`} />
              </div>

              <div>
                <Label>نوع الجهة</Label>
                <div className="flex flex-wrap gap-2">
                  {ORG_KINDS.map((k) => (
                    <Chip key={k} on={kind === k} onClick={() => setKind(k)}>
                      {k}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input aria-label="اسم المدرسة أو الجامعة" required placeholder="اسم المدرسة أو الجامعة" className={fieldCls} />
                <input aria-label="المدينة والدولة" placeholder="مثال: الرياض، السعودية" className={fieldCls} />
                <input aria-label="عدد المعلمين" inputMode="numeric" placeholder="مثال: 40" className={fieldCls} />
                <input aria-label="عدد الطلاب" inputMode="numeric" placeholder="مثال: 900" className={fieldCls} />
              </div>

              <div>
                <Label htmlFor="stages">المراحل والمواد</Label>
                <input id="stages" placeholder="مثال: المتوسط والثانوي، العلوم والرياضيات" className={fieldCls} />
              </div>

              <div>
                <Label htmlFor="needs">حدّثنا عن احتياجكم</Label>
                <textarea
                  id="needs"
                  rows={4}
                  placeholder="مثال: نريد أن يستخدمها معلمو العلوم في الحصص، مع تقرير شهري للإدارة، وربط بمنصة مدرستي."
                  className={`${fieldCls} resize-none leading-7`}
                />
              </div>

              <div>
                <Label>متى تريدون البدء؟</Label>
                <div className="flex flex-wrap gap-2">
                  {START.map((w) => (
                    <Chip key={w} on={when === w} onClick={() => setWhen(w)}>
                      {w}
                    </Chip>
                  ))}
                </div>
              </div>

              <button className="rounded-full bg-indigo-deep px-8 py-3 text-sm font-bold text-white shadow-md transition hover:bg-indigo-ink">
                أرسل الطلب
              </button>
            </form>
          )}
        </section>
      </main>
      {toast.node}
    </>
  );
}
