"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { postJson } from "@/lib/client-api";
import { Overlay } from "./Overlay";

/** "أبلغ عن خطأ": a student (or a teacher previewing) tells the lesson's owner that a station or challenge looks wrong */
export function ReportButton({ code, stationId, part }: { code: string; stationId: string; part: "station" | "challenge" }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function send() {
    setState("sending");
    const r = await postJson("/api/reports", { code, stationId, part, note });
    setState(r.ok ? "done" : "error");
  }
  function close() {
    setOpen(false);
    setNote("");
    setState("idle");
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-violet/15 bg-white px-3 py-1.5 text-xs font-bold text-indigo-deep/80 transition hover:border-violet/40">
        <Flag className="size-3" aria-hidden />
        أبلغ عن خطأ
      </button>
      {open && (
        <Overlay label="الإبلاغ عن خطأ">
          {state === "done" ? (
            <>
              <h2 className="text-lg font-bold text-indigo-deep">شكرًا لك</h2>
              <p className="mt-2 text-sm font-medium leading-7 text-indigo-deep/70">وصل بلاغك إلى صاحب الدرس.</p>
              <button onClick={close} className="mt-5 rounded-full bg-brand px-8 py-3 text-sm font-bold text-white">حسنًا</button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-indigo-deep">ما الخطأ في {part === "challenge" ? "هذا التحدي" : "هذه المحطة"}؟</h2>
              <label htmlFor="report-note" className="sr-only">وصف الخطأ</label>
              <textarea id="report-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={3} placeholder="مثال: الإجابة الصحيحة غير صحيحة (اختياري)" className="mt-3 w-full rounded-2xl border border-violet/15 p-3 text-start text-sm text-indigo-deep outline-none focus:border-violet focus:ring-4 focus:ring-violet/10" />
              {state === "error" && <p role="alert" className="mt-2 text-xs font-bold text-rose-700">تعذّر الإرسال. حاول مرة أخرى.</p>}
              <div className="mt-4 flex justify-center gap-3">
                <button onClick={send} disabled={state === "sending"} className="rounded-full bg-brand px-7 py-3 text-sm font-bold text-white disabled:opacity-60">أرسل البلاغ</button>
                <button onClick={close} className="rounded-full border border-violet/15 px-6 py-3 text-sm font-bold text-indigo-deep">إلغاء</button>
              </div>
            </>
          )}
        </Overlay>
      )}
    </>
  );
}
