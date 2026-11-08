"use client";

import { useState } from "react";
import Link from "next/link";
import { postJson } from "@/lib/client-api";
import { Field, FormError, PrimaryButton, inputCls } from "./parts";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const r = await postJson<{ devLink?: string }>("/api/auth/forgot", { email });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setDevLink(r.data.devLink ?? null);
    setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <div className="mt-5">
        <p role="status" className="rounded-2xl bg-mint/15 px-5 py-4 text-sm font-bold leading-7 text-emerald-900">
          إن كان <span dir="ltr">{sentTo}</span> مسجّلًا لدينا فقد أرسلنا إليه رابطًا لاختيار كلمة مرور جديدة. الرابط صالح ساعة واحدة. تفقّد البريد المزعج أيضًا.
        </p>
        {devLink && (
          <p className="mt-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold leading-6 text-amber-900">
            (للتجربة فقط، لم يُربط مزوّد بريد بعد){" "}
            <a href={devLink} className="font-bold text-violet underline underline-offset-4">
              افتح رابط إعادة التعيين
            </a>
          </p>
        )}
        <Link href="/login" className="mt-5 inline-block rounded-full bg-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30">
          عُد إلى تسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-5 space-y-4">
      <Field label="البريد الإلكتروني">
        <input type="email" required dir="ltr" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@school.com" className={`${inputCls} text-start`} />
      </Field>
      <FormError message={error} />
      <PrimaryButton type="submit" disabled={busy || !email.trim()}>
        {busy ? "جارٍ الإرسال…" : "أرسل رابط إعادة التعيين"}
      </PrimaryButton>
      <p className="text-center text-xs text-indigo-deep/70">
        تذكّرتها؟{" "}
        <Link href="/login" className="font-bold text-violet underline underline-offset-4">
          سجّل الدخول
        </Link>
      </p>
    </form>
  );
}
