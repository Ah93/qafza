"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, postJson } from "@/lib/client-api";
import { Logo } from "../Logo";

type Stage = "loading" | "invalid" | "ask" | "approved" | "declined";

/** the page a parent lands on from the email: read the request, then agree or refuse */
export function ParentDecision() {
  const token = useSearchParams().get("token") ?? "";
  const [stage, setStage] = useState<Stage>(token ? "loading" : "invalid");
  const [child, setChild] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let live = true;
    api<{ valid: boolean; first?: string }>(`/api/auth/consent/review?token=${encodeURIComponent(token)}`).then((r) => {
      if (!live) return;
      if (r.ok && r.data.valid) {
        setChild(r.data.first ?? "");
        setStage("ask");
      } else setStage("invalid");
    });
    return () => {
      live = false;
    };
  }, [token]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const r = await postJson("/api/auth/consent/decide", { token, approve });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setStage(approve ? "approved" : "declined");
  }

  return (
    <>
      <header className="border-b border-violet/5 bg-white/80">
        <div className="mx-auto flex h-[56px] max-w-[1080px] items-center justify-between px-5">
          <Logo />
          <span className="text-[11px] font-bold text-indigo-deep/70">موافقة ولي الأمر</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[520px] flex-1 px-5 py-10">
        <section className="rounded-[28px] border border-violet/10 bg-white p-6 shadow-xl shadow-violet/5 sm:p-8">
          {stage === "loading" && <p role="status" className="text-center text-sm font-bold text-indigo-deep/60">جارٍ فتح الطلب…</p>}

          {stage === "invalid" && (
            <div role="alert" className="text-center">
              <h1 className="text-2xl font-bold text-indigo-deep">هذا الرابط لم يعد صالحًا</h1>
              <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/65">إما أُجيب عن الطلب من قبل، أو انتهت مهلته (7 أيام). يستطيع طفلك أن يرسل طلبًا جديدًا من صفحة التسجيل.</p>
            </div>
          )}

          {stage === "ask" && (
            <>
              <span className="inline-block rounded-full bg-pink-card/10 px-4 py-1.5 text-[11px] font-bold text-pink-card">طلب موافقة</span>
              <h1 className="mt-3 text-[28px] font-bold leading-snug text-indigo-deep">{child} يريد إنشاء حساب في قفزة</h1>
              <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/70">قفزة منصة يلعب فيها الطلاب دروسهم مع معلّميهم. عمر {child} أقل من 13 سنة، فلا يُنشأ حسابه إلا بموافقتك.</p>
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="rounded-2xl bg-mint/10 p-3.5">
                  <p className="text-xs font-bold text-emerald-800">ما نحفظه</p>
                  <p className="mt-1 text-[11px] font-medium leading-5 text-emerald-900/80">الاسم الأول والبريد، والتقدّم في الدروس، والنقاط والشارات.</p>
                </div>
                <div className="rounded-2xl bg-rose-50 p-3.5">
                  <p className="text-xs font-bold text-rose-800">ما لا نجمعه أبدًا</p>
                  <p className="mt-1 text-[11px] font-medium leading-5 text-rose-900/80">الصور، والموقع، وجهات الاتصال، والإعلانات.</p>
                </div>
              </div>
              {error && <p role="alert" className="mt-3 text-xs font-bold text-[#c0174f]">{error}</p>}
              <div className="mt-5 flex gap-2.5">
                <button disabled={busy} onClick={() => decide(true)} className="flex-1 rounded-full bg-brand py-3.5 text-sm font-bold text-white shadow-md shadow-violet/30 transition hover:brightness-110 disabled:opacity-60">
                  أوافق
                </button>
                <button disabled={busy} onClick={() => decide(false)} className="rounded-full border border-violet/15 bg-white px-7 py-3.5 text-sm font-bold text-indigo-deep transition hover:border-violet/40 disabled:opacity-60">
                  لا أوافق
                </button>
              </div>
              <p className="mt-3 text-center text-[11px] font-medium text-indigo-deep/50">إن لم تكن تعرف {child} فاختر «لا أوافق»، وسنحذف الطلب.</p>
            </>
          )}

          {stage === "approved" && (
            <div role="status" className="text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-mint text-3xl text-white">✓</span>
              <h1 className="mt-4 text-2xl font-bold text-indigo-deep">شكرًا، وافقت</h1>
              <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/65">أُنشئ حساب {child}. يستطيع الآن تسجيل الدخول ببريده وكلمة مروره. يمكنك إغلاق هذه الصفحة.</p>
            </div>
          )}

          {stage === "declined" && (
            <div role="status" className="text-center">
              <h1 className="text-2xl font-bold text-indigo-deep">لم نُنشئ الحساب</h1>
              <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/65">رفضت الطلب فحذفناه، ولم نحتفظ بشيء. يمكنك إغلاق هذه الصفحة.</p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
