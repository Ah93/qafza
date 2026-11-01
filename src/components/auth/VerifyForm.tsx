"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, postJson } from "@/lib/client-api";

const LEN = 6;
const DEV_KEY = "qafza:devcode";

const MAIL_KEY = "qafza:mailerror";

const noopSubscribe = () => () => {};
function readMailError() {
  try {
    return sessionStorage.getItem(MAIL_KEY) ?? "";
  } catch {
    return "";
  }
}
function readDevCode() {
  try {
    return sessionStorage.getItem(DEV_KEY) ?? "";
  } catch {
    return "";
  }
}

function mask(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "••••@••••";
  return `${user.slice(0, 2)}***@${domain}`;
}

export function VerifyForm() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"teach" | "learn">("teach");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(45);
  const devCode = useSyncExternalStore(noopSubscribe, readDevCode, () => "");
  const mailError = useSyncExternalStore(noopSubscribe, readMailError, () => "");
  const [mailCleared, setMailCleared] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
    api<{ user: { email: string; verified: boolean; role: "teach" | "learn" } | null }>("/api/auth/me").then((r) => {
      if (!r.ok || !r.data.user) return;
      setEmail(r.data.user.email);
      setRole(r.data.user.role);
      if (r.data.user.verified) router.replace(r.data.user.role === "learn" ? "/learn" : "/dashboard");
    });
  }, [router]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  function setAt(i: number, v: string) {
    const clean = v.replace(/\D/g, "");
    if (!clean) {
      setDigits((d) => d.map((x, j) => (j === i ? "" : x)));
      return;
    }
    setError(null);
    setDigits((d) => {
      const next = [...d];
      clean
        .slice(0, LEN - i)
        .split("")
        .forEach((c, k) => (next[i + k] = c));
      return next;
    });
    refs.current[Math.min(i + clean.length, LEN - 1)]?.focus();
  }

  const complete = digits.every(Boolean);

  async function confirm() {
    if (!complete || busy) return;
    setBusy(true);
    const r = await postJson("/api/auth/verify", { code: digits.join("") });
    if (!r.ok) {
      setBusy(false);
      setError(r.error);
      if (r.status === 400) {
        setDigits(Array(LEN).fill(""));
        refs.current[0]?.focus();
      }
      return;
    }
    try {
      sessionStorage.removeItem(DEV_KEY);
    } catch {}
    router.push(role === "learn" ? "/learn" : "/dashboard");
    router.refresh();
  }

  async function resend() {
    setError(null);
    const r = await postJson<{ wait?: number; devCode?: string }>("/api/auth/resend", {});
    if (!r.ok) return setError(r.error);
    try {
      if (r.data.devCode) sessionStorage.setItem(DEV_KEY, r.data.devCode);
      sessionStorage.removeItem(MAIL_KEY);
    } catch {}
    setMailCleared(true);
    setDigits(Array(LEN).fill(""));
    setSeconds(r.data.wait ?? 45);
  }

  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="mx-auto w-full max-w-[440px] rounded-[28px] border border-violet/10 bg-white px-5 py-9 text-center sm:px-8 shadow-xl shadow-violet/10">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-violet/10 text-violet">✉</span>
      <h1 className="mt-4 text-3xl font-bold text-indigo-deep">أكّد بريدك</h1>
      <p className="mt-2 text-xs text-indigo-deep/70">
        أرسلنا رمزًا من 6 أرقام إلى{" "}
        <b dir="ltr" className="font-bold text-indigo-deep">
          {mask(email)}
        </b>
      </p>

      {mailError && !mailCleared && (
        <p role="alert" className="mx-auto mt-4 rounded-2xl bg-rose-50 px-4 py-2.5 text-[11px] font-bold leading-5 text-rose-700">
          تعذّر إرسال الرمز: {mailError} اضغط «أعد إرسال الرمز» بعد قليل.
        </p>
      )}

      {devCode && (
        <button
          type="button"
          onClick={() => setDigits(devCode.split(""))}
          className="mx-auto mt-4 block rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-2.5 text-[11px] font-semibold leading-5 text-amber-900"
        >
          وضع التجربة: لم يُربط مزوّد بريد بعد، فرمزك <b dir="ltr">{devCode}</b>. اضغط لتعبئته.
        </button>
      )}

      <div dir="ltr" className="mt-6 flex justify-center gap-2 sm:gap-2.5">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`الرقم ${i + 1}`}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "Enter") confirm();
            }}
            className={`size-10 rounded-xl border text-center sm:size-11 text-lg font-bold text-indigo-deep outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/10 ${
              error ? "border-rose-400 bg-rose-50" : "border-violet/10 bg-lavender"
            }`}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-xs font-bold text-rose-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={confirm}
        disabled={!complete || busy}
        className="mt-5 rounded-full bg-brand px-10 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet/30 disabled:opacity-40"
      >
        {busy ? "جارٍ التأكيد…" : "تأكيد"}
      </button>

      <p className="mt-5 text-[11px] text-indigo-deep/60">
        {seconds > 0 ? (
          `يمكنك طلب رمز جديد بعد ${mm}:${ss}`
        ) : (
          <button onClick={resend} className="font-bold text-violet underline underline-offset-4">
            أعد إرسال الرمز
          </button>
        )}
      </p>
      <p className="mt-2 text-[11px] text-indigo-deep/60">
        لم يصلك؟ تفقّد الرسائل غير المرغوبة، أو{" "}
        <Link href="/signup" className="font-bold text-violet underline underline-offset-2">
          غيّر البريد
        </Link>
        .
      </p>
    </div>
  );
}
