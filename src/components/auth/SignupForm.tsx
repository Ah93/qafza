"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/client-api";
import { Field, FormError, PrimaryButton, inputCls } from "./parts";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const COUNTRIES = [
  { name: "السعودية", dial: "+966" },
  { name: "قطر", dial: "+974" },
  { name: "الإمارات", dial: "+971" },
  { name: "الكويت", dial: "+965" },
  { name: "مصر", dial: "+20" },
];
const NOW = 2026;
const YEARS = Array.from({ length: 90 }, (_, i) => NOW - i);

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++;
  if (pw.length >= 10 && /[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  return s;
}
const LEVELS = ["", "ضعيفة", "مقبولة", "جيدة", "كلمة مرور قوية"];
const LEVEL_COLORS = ["bg-violet/10", "bg-rose-400", "bg-amber-400", "bg-mint", "bg-mint"];

const selectCls = `${inputCls} appearance-none`;

export function SignupForm() {
  const router = useRouter();
  const [role, setRole] = useState<"teach" | "learn">("teach");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [country, setCountry] = useState(COUNTRIES[0].dial);
  const [day, setDay] = useState(1);
  const [month, setMonth] = useState(0);
  const [year, setYear] = useState(2000);
  const [agree, setAgree] = useState(true);
  const [email, setEmail] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const score = strength(pw);
  
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const dial = COUNTRIES.find((c) => c.dial === country)?.name ?? "";
    const r = await postJson<{ verified?: boolean; needsConsent?: boolean; consentId?: string; devCode?: string; mailError?: string }>("/api/auth/signup", { first, last, email, password: pw, role, country: dial, birthYear: year, birthMonth: month, birthDay: day });
    if (!r.ok) {
      setBusy(false);
      return setError(r.error);
    }
    try {
      sessionStorage.setItem("qafza:email", email);
      sessionStorage.setItem("qafza:role", role);
      sessionStorage.setItem("qafza:first", first);
      if (r.data.devCode) sessionStorage.setItem("qafza:devcode", r.data.devCode);
      if (r.data.mailError) sessionStorage.setItem("qafza:mailerror", r.data.mailError);
      if (r.data.consentId) sessionStorage.setItem("qafza:consent", r.data.consentId);
    } catch {}
    router.push(r.data.needsConsent ? "/parent-consent" : r.data.verified ? (role === "learn" ? "/learn" : "/dashboard") : "/verify");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <div className="flex items-center justify-between rounded-2xl border border-violet/10 bg-violet/5 p-2.5">
        <span className="px-2 text-[11px] font-semibold text-violet">حساب واحد تعلّم به وتتعلّم.</span>
        <div className="flex gap-1 rounded-full bg-white p-1 text-xs font-bold">
          {(["teach", "learn"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-full px-4 py-1.5 transition ${
                role === r ? "bg-indigo-deep text-white" : "text-indigo-deep/50"
              }`}
            >
              {r === "teach" ? "أعلّم" : "أتعلّم"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="الاسم الأول">
          <input required value={first} onChange={(e) => setFirst(e.target.value)} placeholder="فيصل" className={inputCls} />
        </Field>
        <Field label="اسم العائلة">
          <input required value={last} onChange={(e) => setLast(e.target.value)} placeholder="عمر" className={inputCls} />
        </Field>
      </div>

      <Field label="البريد الإلكتروني">
        <input
          type="email"
          required
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@school.com"
          className={`${inputCls} text-start`}
        />
      </Field>

      <div>
        <Field label="كلمة المرور">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              required
              minLength={8}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className={`${inputCls} pe-16 text-start`}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute end-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-violet"
            >
              {show ? "إخفاء" : "إظهار"}
            </button>
          </div>
        </Field>
        <div className="mt-2 grid grid-cols-4 gap-1.5" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={`h-1 rounded-full ${i <= score ? LEVEL_COLORS[score] : "bg-violet/15"}`} />
          ))}
        </div>
        {score > 0 && (
          <p className={`mt-1.5 text-[11px] font-bold ${score >= 3 ? "text-emerald-600" : "text-amber-600"}`}>
            {LEVELS[score]}
          </p>
        )}
      </div>

      <Field label="الدولة">
        <select value={country} onChange={(e) => setCountry(e.target.value)} className={selectCls}>
          {COUNTRIES.map((c) => (
            <option key={c.dial} value={c.dial}>
              {c.name} {c.dial}
            </option>
          ))}
        </select>
      </Field>

      <div>
        <span className="mb-1.5 block text-xs font-bold text-indigo-deep">تاريخ الميلاد</span>
        <div className="grid grid-cols-3 gap-2.5">
          <select aria-label="اليوم" value={day} onChange={(e) => setDay(+e.target.value)} className={selectCls}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select aria-label="الشهر" value={month} onChange={(e) => setMonth(+e.target.value)} className={selectCls}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select aria-label="السنة" value={year} onChange={(e) => setYear(+e.target.value)} className={selectCls}>
            {YEARS.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-[11px] text-indigo-deep/60">
          نسأله مرة واحدة: من هم دون 13 يحتاجون موافقة ولي الأمر.
        </p>
      </div>

      <label className="flex items-center gap-2 text-xs text-indigo-deep/80">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="size-4 accent-violet" />
        <span>
          أوافق على{" "}
          <Link href="/terms" className="font-bold text-violet underline underline-offset-2">
            الشروط
          </Link>{" "}
          و{" "}
          <Link href="/privacy" className="font-bold text-violet underline underline-offset-2">
            سياسة الخصوصية
          </Link>
        </span>
      </label>

      <FormError message={error} />
      <PrimaryButton type="submit" disabled={!agree || busy || !first.trim() || !email || pw.length < 8}>
        {busy ? "جارٍ إنشاء الحساب…" : "أنشئ حسابي"}
      </PrimaryButton>

    </form>
  );
}
