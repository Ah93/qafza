"use client";

import { useEffect, useRef, useState } from "react";
import { postJson } from "@/lib/client-api";
import { Chip, Label, fieldCls } from "../teacher/ui";

const STAGES = ["ابتدائي", "متوسط", "ثانوي", "جامعي", "تدريب", "أخرى"];
const COUNTRIES = ["السعودية", "قطر", "الإمارات", "الكويت", "مصر", "أخرى"];
const DEVICES = ["نعم", "لا", "بعضهم"];

/** the strip above the home page: we are looking for 100 teachers to test the platform together */
export function BetaBar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="bg-gradient-to-l from-indigo-deep to-[#4a1d96] px-5 py-2.5 text-center text-xs font-bold text-white">
        نبحث عن 100 معلّم لاختبار المنصة سويًّا، من الابتدائي إلى الجامعة.{" "}
        <button onClick={() => setOpen(true)} className="ms-2 rounded-full bg-white px-4 py-1.5 text-[11px] font-bold text-indigo-deep transition hover:bg-white/90">
          سجّل الآن
        </button>
      </div>
      {open && <WaitlistForm onClose={() => setOpen(false)} />}
    </>
  );
}

function WaitlistForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [stage, setStage] = useState("");
  const [country, setCountry] = useState("");
  const [devices, setDevices] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ mailed: boolean; already: boolean } | null>(null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const r = await postJson<{ mailed: boolean; already: boolean }>("/api/waitlist", { name, email, subject, stage, country, devices });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setDone(r.data);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-indigo-deep/40 p-5 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="wl-title" className="my-auto w-full max-w-[480px] animate-[pop_.3s_ease-out] rounded-[28px] bg-white p-6 shadow-2xl shadow-indigo-deep/30">
        {done ? (
          <div className="py-4 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-mint text-2xl text-white">✓</span>
            <h2 id="wl-title" className="mt-4 text-2xl font-bold text-indigo-deep">{done.already ? "أنت مسجّل عندنا" : "سُجّلت في القائمة"}</h2>
            <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/65">
              {done.already ? "سبق أن سجّلت بهذا البريد، فلا حاجة إلى شيء آخر." : done.mailed ? "أرسلنا إلى بريدك رسالة تأكيد. نتواصل معك حين يحين دورك." : "حُفظ تسجيلك. تعذّر إرسال رسالة التأكيد الآن، لكننا سنتواصل معك."}
            </p>
            <button onClick={onClose} className="mt-5 rounded-full bg-brand px-10 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30">
              تمام
            </button>
          </div>
        ) : (
          <form ref={ref} onSubmit={submit} noValidate>
            <h2 id="wl-title" className="text-2xl font-bold text-indigo-deep">انضم إلى المعلّمين المئة</h2>
            <p className="mt-1 text-xs font-medium text-indigo-deep/60">أخبرنا قليلًا عنك وعن صفك، وسنتواصل معك.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="wn">الاسم</Label>
                <input id="wn" data-autofocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={fieldCls} />
              </div>
              <div>
                <Label htmlFor="we">البريد الإلكتروني</Label>
                <input id="we" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className={`${fieldCls} text-start`} />
              </div>
            </div>
            <div className="mt-3">
              <Label htmlFor="ws">المادة</Label>
              <input id="ws" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={60} placeholder="مثال: العلوم" className={fieldCls} />
            </div>
            <div className="mt-3">
              <Label>المرحلة</Label>
              <div className="flex flex-wrap gap-2">
                {STAGES.map((x) => (
                  <Chip key={x} on={stage === x} onClick={() => setStage(x)}>
                    {x}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <Label>الدولة</Label>
              <div className="flex flex-wrap gap-2">
                {COUNTRIES.map((x) => (
                  <Chip key={x} on={country === x} onClick={() => setCountry(x)}>
                    {x}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <Label>هل لدى الطلاب أجهزة في الصف؟</Label>
              <div className="flex flex-wrap gap-2">
                {DEVICES.map((x) => (
                  <Chip key={x} on={devices === x} onClick={() => setDevices(x)}>
                    {x}
                  </Chip>
                ))}
              </div>
            </div>
            {error && <p role="alert" className="mt-3 text-xs font-bold text-[#c0174f]">{error}</p>}
            <div className="mt-5 flex gap-2.5">
              <button disabled={busy} className="flex-1 rounded-full bg-brand py-3 text-sm font-bold text-white shadow-lg shadow-violet/30 disabled:opacity-60">
                {busy ? "جارٍ التسجيل…" : "سجّلني"}
              </button>
              <button type="button" onClick={onClose} className="rounded-full border border-violet/15 px-6 py-3 text-xs font-bold text-violet">
                إلغاء
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
