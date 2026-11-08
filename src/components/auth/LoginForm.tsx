"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { postJson } from "@/lib/client-api";
import { Field, FormError, PrimaryButton, inputCls } from "./parts";

/** only same-site paths: an attacker must not be able to bounce a signed-in user to another domain */
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [show, setShow] = useState(false);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const r = await postJson<{ verified: boolean; devCode?: string; mailError?: string }>("/api/auth/login", { email, password });
    if (!r.ok) {
      setBusy(false);
      return setError(r.error);
    }
    try {
      if (r.data.devCode) sessionStorage.setItem("qafza:devcode", r.data.devCode);
      if (r.data.mailError) sessionStorage.setItem("qafza:mailerror", r.data.mailError);
    } catch {}
    router.push(r.data.verified ? (next ?? "/dashboard") : "/verify");
    router.refresh();
  }

  return (
    <>
      <form className="space-y-4" onSubmit={submit} noValidate>
        <Field label="البريد الإلكتروني">
          <input
            type="email"
            required
            dir="ltr"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@school.com"
            className={`${inputCls} text-start`}
          />
        </Field>
        <Field
          label="كلمة المرور"
          aside={
            <Link href="/forgot" className="text-xs font-semibold text-violet">
              نسيت كلمة المرور؟
            </Link>
          }
        >
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`${inputCls} pe-16 text-start`}
            />
            <button type="button" onClick={() => setShow(!show)} className="absolute end-4 top-1/2 -translate-y-1/2 text-xs font-bold text-violet">
              {show ? "إخفاء" : "إظهار"}
            </button>
          </div>
        </Field>
        <FormError message={error} />
        <PrimaryButton type="submit" disabled={busy || !email || !password}>
          {busy ? "جارٍ الدخول…" : "تسجيل الدخول"}
        </PrimaryButton>
      </form>

      <form
        className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-violet/25 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) router.push("/join?code=" + encodeURIComponent(code.trim()));
        }}
      >
        <span className="flex-1 text-xs font-bold text-indigo-deep">طالب ومعك رمز لعبة؟</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={4}
          dir="ltr"
          placeholder="الرمز"
          aria-label="رمز اللعبة"
          className="w-24 rounded-xl border border-violet/10 bg-white py-2 text-center text-sm font-bold tracking-widest text-indigo-deep outline-none placeholder:text-sm placeholder:font-medium placeholder:tracking-normal placeholder:text-indigo-deep/65 focus:border-violet"
        />
        <button className="rounded-xl bg-indigo-deep px-4 py-2 text-xs font-bold text-white">ادخل</button>
      </form>
    </>
  );
}
