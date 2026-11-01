"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

export function CodeCard({ code }: { code: string }) {
  const URL_TEXT = `qafza.ai/${code}`;
  const qr = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  async function copy(what: "link" | "code") {
    try {
      await navigator.clipboard.writeText(what === "link" ? `https://${URL_TEXT}` : code);
      setCopied(what);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  }

  function downloadQr() {
    const svg = qr.current?.querySelector("svg");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
    a.download = `qafza-${code}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <aside className="space-y-3 lg:sticky lg:top-20">
      <div className="dots relative overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-deep to-[#4a1d96] p-4 text-center text-white shadow-xl shadow-indigo-deep/25">
        <p className="relative text-[11px] font-medium text-white/70">رمز الدرس</p>
        <p dir="ltr" className="relative mt-1 text-[44px] font-bold leading-tight tracking-wider">
          {code}
        </p>

        <div ref={qr} className="relative mx-auto mt-3 w-fit rounded-2xl bg-white p-3">
          <QRCodeSVG value={`https://${URL_TEXT}`} size={132} level="M" fgColor="#1b0f3d" title={`رمز QR للدرس ${code}`} />
        </div>

        <div className="relative mt-3.5 flex items-center justify-between gap-2 rounded-2xl bg-white/10 py-2 pe-3 ps-2">
          <span dir="ltr" className="truncate text-[11px] font-semibold text-white/90">
            {URL_TEXT}
          </span>
          <button
            onClick={() => copy("link")}
            className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold text-indigo-deep"
          >
            {copied === "link" ? "تم النسخ" : "انسخ الرابط"}
          </button>
        </div>

        <div className="relative mt-2.5 flex justify-center gap-2">
          <button
            onClick={() => copy("code")}
            className="rounded-full bg-white/15 px-4 py-1.5 text-[11px] font-bold transition hover:bg-white/25"
          >
            {copied === "code" ? "تم النسخ" : "انسخ الرمز"}
          </button>
          <button
            onClick={downloadQr}
            className="rounded-full bg-white/15 px-4 py-1.5 text-[11px] font-bold transition hover:bg-white/25"
          >
            نزّل QR
          </button>
        </div>
      </div>

      <Link
        href="/play/preview"
        className="block rounded-full border border-violet/10 bg-white py-3 text-center text-xs font-bold text-violet shadow-sm transition hover:border-violet/30"
      >
        جرّبه كطالب قبل النشر
      </Link>
    </aside>
  );
}
