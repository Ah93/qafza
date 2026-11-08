"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { api, postJson } from "@/lib/client-api";
import { Logo } from "../Logo";

type Status = "pending" | "approved" | "declined" | "failed" | "expired";
type Info = { status: Status; parent: string | null; first?: string };

const noop = () => () => {};
const read = (key: string) => () => {
  try {
    return sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};

const POLL_MS = 5000;

export function ParentConsent() {
  const id = useSyncExternalStore(noop, read("qafza:consent"), () => "");
  const child = useSyncExternalStore(noop, read("qafza:first"), () => "") || "طفلك";
  const [info, setInfo] = useState<Info | null>(null);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    const r = await api<Info>(`/api/auth/consent?id=${encodeURIComponent(id)}`);
    if (r.ok) setInfo(r.data);
  }, [id]);

  // the request's state lives on the server: ask on arrival, then keep asking while the parent has not answered
  useEffect(() => {
    if (!id) return;
    const first = setTimeout(() => void refresh(), 0);
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [id, refresh]);

  const valid = /^\S+@\S+\.\S+$/.test(email);
  const status = info?.status ?? "pending";
  const sent = status === "pending" && !!info?.parent;
  const stage = status === "approved" ? "approved" : status === "declined" ? "declined" : status === "failed" ? "failed" : status === "expired" ? "expired" : sent ? "sent" : "email";
  const step = stage === "email" ? 1 : stage === "sent" ? 2 : 3;
  const masked = info?.parent ?? "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (!valid) return;
    setBusy(true);
    const r = await postJson<{ devLink?: string }>("/api/auth/consent", { id, parentEmail: email });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setDevLink(r.data.devLink ?? null);
    await refresh();
  }

  const steps = [
    { n: 1, title: "أدخل بريد ولي أمرك", body: "لأن عمرك أقل من 13، نحتاج موافقته قبل إنشاء حسابك." },
    { n: 2, title: "أرسلنا الطلب", body: "نحتفظ بطلبك 7 أيام حتى يوافق." },
    { n: 3, title: "وافق ولي أمرك", body: "يُنشأ حسابك، وتدخل به بعد تأكيد بريدك." },
  ];

  return (
    <>
      <header className="border-b border-violet/5 bg-white/80">
        <div className="mx-auto flex h-[56px] max-w-[1080px] items-center justify-between px-5">
          <Logo />
          <span className="text-xs font-bold text-indigo-deep/70">حساب طالب دون 13 سنة</span>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[960px] flex-1 grid-cols-1 items-start gap-5 px-5 py-9 md:grid-cols-2">
        <section className="min-w-0 rounded-[28px] border border-violet/10 bg-white p-6 shadow-xl shadow-violet/5 sm:p-7">
          <span className="inline-block rounded-full bg-pink-card/10 px-4 py-1.5 text-xs font-bold text-pink-card">ما يراه الطالب</span>
          <h1 className="mt-3 text-[32px] font-bold leading-tight text-indigo-deep">لنفتح حسابك بأمان</h1>

          <ol className="mt-5 space-y-4">
            {steps.map((s) => {
              const done = s.n < step || stage === "approved";
              const on = s.n === step && stage !== "approved";
              return (
                <li key={s.n} className="flex items-start gap-3.5" aria-current={on ? "step" : undefined}>
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? "bg-mint text-white" : on ? "bg-violet text-white" : "bg-violet/10 text-indigo-deep/70"}`}>{done ? "✓" : s.n}</span>
                  <div className={done || on ? "" : "opacity-60"}>
                    <p className="text-sm font-bold text-indigo-deep">{s.title}</p>
                    <p className="mt-0.5 text-xs font-medium text-indigo-deep/70">{s.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          {!id && (
            <div role="status" className="mt-5 rounded-2xl bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">لا يوجد طلب مفتوح في هذا المتصفح.</p>
              <Link href="/signup" className="mt-3 inline-block rounded-full bg-brand px-8 py-2.5 text-xs font-bold text-white shadow-md shadow-violet/30">
                ابدأ من التسجيل
              </Link>
            </div>
          )}

          {id && stage === "email" && (
            <form noValidate onSubmit={submit} className="mt-5">
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@example.com"
                aria-label="بريد ولي الأمر"
                aria-invalid={touched && !valid}
                className={`w-full rounded-2xl border-2 bg-white px-5 py-3.5 text-start text-sm font-medium text-indigo-deep outline-none transition placeholder:text-indigo-deep/65 focus:ring-4 focus:ring-violet/10 ${touched && !valid ? "border-rose-400" : "border-violet/30 focus:border-violet"}`}
              />
              {touched && !valid && <p className="mt-1.5 text-xs font-semibold text-[#c0174f]">اكتب بريد ولي أمرك كاملًا.</p>}
              {error && <p role="alert" className="mt-2 text-xs font-bold text-[#c0174f]">{error}</p>}
              <button disabled={busy} className="mt-3 w-full rounded-full bg-brand py-3.5 text-base font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110 disabled:opacity-60">
                {busy ? "جارٍ الإرسال…" : "أرسل طلب الموافقة"}
              </button>
            </form>
          )}

          {stage === "sent" && (
            <div role="status" className="mt-5 rounded-2xl bg-violet/[0.06] px-4 py-3.5 text-xs font-semibold leading-6 text-indigo-deep/80">
              أرسلنا الطلب إلى <b dir="ltr">{masked}</b>. حين يوافق ولي أمرك ستتحدّث هذه الصفحة وحدها. الطلب محفوظ 7 أيام.
              {devLink && (
                <span className="mt-2 block rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  (للتجربة فقط، لم يُربط مزوّد بريد بعد){" "}
                  <a href={devLink} target="_blank" rel="noreferrer" className="font-bold text-violet underline underline-offset-4">
                    افتح رابط ولي الأمر
                  </a>
                </span>
              )}
              <button onClick={() => setInfo((i) => (i ? { ...i, parent: null } : i))} className="mt-2 block text-xs font-bold text-violet underline underline-offset-4">
                أرسل إلى بريد آخر
              </button>
            </div>
          )}

          {stage === "approved" && (
            <div role="status" className="mt-5 rounded-2xl bg-mint/15 p-4">
              <p className="text-sm font-bold text-emerald-800">وافق ولي أمرك! أُنشئ حسابك. ادخل ببريدك وكلمة مرورك، وسنرسل إليك رمز تأكيد.</p>
              <Link href="/login" className="mt-3 inline-block rounded-full bg-brand px-8 py-2.5 text-xs font-bold text-white shadow-md shadow-violet/30">
                سجّل الدخول
              </Link>
            </div>
          )}

          {stage === "declined" && (
            <div role="status" className="mt-5 rounded-2xl bg-rose-50 p-4">
              <p className="text-sm font-bold text-rose-800">لم يوافق ولي أمرك، فلن يُنشأ حساب، وحُذف طلبك.</p>
              <Link href="/signup" className="mt-3 inline-block rounded-full border border-rose-200 bg-white px-6 py-2 text-xs font-bold text-[#c0174f]">
                ابدأ من جديد
              </Link>
            </div>
          )}

          {stage === "failed" && (
            <div role="alert" className="mt-5 rounded-2xl bg-rose-50 p-4">
              <p className="text-sm font-bold text-rose-800">وافق ولي أمرك، لكن هذا البريد صار مسجّلًا لحساب آخر. سجّل ببريد مختلف.</p>
              <Link href="/signup" className="mt-3 inline-block rounded-full border border-rose-200 bg-white px-6 py-2 text-xs font-bold text-[#c0174f]">
                ابدأ من جديد
              </Link>
            </div>
          )}

          {id && stage === "expired" && (
            <div role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">انتهت مهلة الطلب (7 أيام) أو أُغلق. ابدأ التسجيل من جديد.</p>
              <Link href="/signup" className="mt-3 inline-block rounded-full bg-brand px-8 py-2.5 text-xs font-bold text-white shadow-md shadow-violet/30">
                ابدأ من جديد
              </Link>
            </div>
          )}
        </section>

        <section className="min-w-0 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
          <span className="inline-block rounded-full bg-sky-100 px-4 py-1.5 text-xs font-bold text-sky-700">ما يصل ولي الأمر</span>
          <div className="mt-3 rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
            <p dir="auto" className="text-xs font-semibold text-indigo-deep/70">
              من: قفزة · إلى: <span dir="ltr">{masked || "parent@…"}</span>
            </p>
            <h2 className="mt-2 text-[22px] font-bold leading-snug text-indigo-deep">{child} يريد إنشاء حساب في قفزة</h2>
            <p className="mt-1.5 text-xs font-medium leading-6 text-indigo-deep/70">قفزة منصة يلعب فيها الطلاب دروسهم مع معلّميهم. عمر {child} أقل من 13 سنة، فلا يُنشأ حسابه إلا بموافقتك.</p>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="rounded-2xl bg-mint/10 p-3.5">
                <p className="text-xs font-bold text-emerald-800">ما نحفظه</p>
                <p className="mt-1 text-xs font-medium leading-5 text-emerald-900/80">الاسم الأول والبريد، والتقدّم في الدروس، والنقاط والشارات.</p>
              </div>
              <div className="rounded-2xl bg-rose-50 p-3.5">
                <p className="text-xs font-bold text-rose-800">ما لا نجمعه أبدًا</p>
                <p className="mt-1 text-xs font-medium leading-5 text-rose-900/80">الصور، والموقع، وجهات الاتصال، والإعلانات.</p>
              </div>
            </div>
            <p className="mt-3 text-xs font-medium text-indigo-deep/70">يفتح ولي الأمر رابطًا آمنًا، ويوافق أو يرفض بضغطة. وتستطيع حذف الحساب في أي وقت.</p>
            <div className="mt-3 rounded-full bg-violet/10 py-3 text-center text-sm font-bold text-violet">اقرأ الطلب وقرّر</div>
          </div>
        </section>
      </main>
    </>
  );
}
