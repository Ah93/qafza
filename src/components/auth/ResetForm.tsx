"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, postJson } from "@/lib/client-api";
import { Field, FormError, PrimaryButton, inputCls } from "./parts";

export function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [valid, setValid] = useState<boolean | null>(token ? null : false);
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // is the link still good? find out before asking for a password
  useEffect(() => {
    if (!token) return;
    let live = true;
    api<{ valid: boolean }>(`/api/auth/reset?token=${encodeURIComponent(token)}`).then((r) => live && setValid(r.ok && r.data.valid));
    return () => {
      live = false;
    };
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) return setError("كلمة المرور يجب ألا تقل عن 8 أحرف.");
    if (pw !== again) return setError("كلمتا المرور غير متطابقتين.");
    setBusy(true);
    const r = await postJson("/api/auth/reset", { token, password: pw });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setDone(true);
  }

  if (valid === null) return <p role="status" className="mt-5 text-sm font-bold text-indigo-deep/60">جارٍ التحقق من الرابط…</p>;

  if (done) {
    return (
      <div className="mt-5">
        <p role="status" className="rounded-2xl bg-mint/15 px-5 py-4 text-sm font-bold leading-7 text-emerald-900">غُيّرت كلمة مرورك، وخرجنا من جميع الأجهزة التي كانت مسجّلة. ادخل بكلمتك الجديدة.</p>
        <Link href="/login" className="mt-5 inline-block rounded-full bg-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30">
          سجّل الدخول
        </Link>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="mt-5">
        <p role="alert" className="rounded-2xl bg-rose-50 px-5 py-4 text-sm font-bold leading-7 text-rose-800">انتهت صلاحية هذا الرابط أو استُخدم من قبل. اطلب رابطًا جديدًا.</p>
        <Link href="/forgot" className="mt-5 inline-block rounded-full bg-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30">
          اطلب رابطًا جديدًا
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mt-5 space-y-4">
      <Field label="كلمة المرور الجديدة">
        <div className="relative">
          <input type={show ? "text" : "password"} required minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={`${inputCls} pe-16 text-start`} />
          <button type="button" onClick={() => setShow(!show)} className="absolute end-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-violet">
            {show ? "إخفاء" : "إظهار"}
          </button>
        </div>
      </Field>
      <Field label="أعد كتابتها">
        <input type={show ? "text" : "password"} required autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={`${inputCls} text-start`} />
      </Field>
      <p className="text-[11px] text-indigo-deep/60">8 أحرف على الأقل. الأفضل جمع حروف وأرقام.</p>
      <FormError message={error} />
      <PrimaryButton type="submit" disabled={busy || !pw || !again}>
        {busy ? "جارٍ الحفظ…" : "احفظ كلمة المرور"}
      </PrimaryButton>
    </form>
  );
}
