"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlignLeft, Link2, MessageSquareText, Upload, Video, type LucideIcon } from "lucide-react";
import { useFlow, type Source, type SourceType } from "./FlowProvider";

const TABS: { id: SourceType; label: string; icon: LucideIcon }[] = [
  { id: "file", label: "ملف", icon: AlignLeft },
  { id: "link", label: "رابط", icon: Link2 },
  { id: "video", label: "فيديو", icon: Video },
  { id: "text", label: "نص", icon: MessageSquareText },
];

const ACCEPT = ".pdf,.docx,.txt,.md";
const OK_EXT = /\.(pdf|docx|txt|md)$/i;
const MAX_MB = 10;
const MIN_TEXT = 120;
const field =
  "w-full rounded-2xl border border-violet/15 bg-white px-4 py-3.5 text-sm text-indigo-deep outline-none transition placeholder:text-indigo-deep/65 focus:border-violet focus:ring-4 focus:ring-violet/10";

export function UploadCard() {
  const router = useRouter();
  const { user, setSource } = useFlow();
  const [tab, setTab] = useState<SourceType>("file");
  const [over, setOver] = useState(false);
  const [value, setValue] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);

  function go(source: Source) {
    setError(null);
    setSource(source);
    router.push("/create/customize");
  }

  function onFile(file?: File) {
    if (!file) return;
    if (!OK_EXT.test(file.name)) {
      return setError(/\.(pptx?|docx?)$/i.test(file.name) && !/\.docx$/i.test(file.name) ? "هذه الصيغة غير مدعومة بعد. احفظ الملف بصيغة PDF أو DOCX وارفعه من جديد." : "صيغة الملف غير مدعومة. ارفع PDF أو DOCX أو TXT.");
    }
    if (file.size > MAX_MB * 1024 * 1024) return setError(`الملف أكبر من ${MAX_MB} ميغابايت.`);
    go({ type: "file", name: file.name, file, sizeKb: Math.max(1, Math.round(file.size / 1024)) });
  }

  function submitText(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (tab === "text") {
      if (v.length < MIN_TEXT) return setError(`اكتب ${MIN_TEXT} حرفًا على الأقل ليكفي لبناء درس (كتبت ${v.length}).`);
      return go({ type: "text", name: v.slice(0, 40).replace(/\s+/g, " ") + (v.length > 40 ? "…" : ""), text: v });
    }
    try {
      const u = new URL(v);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("scheme");
      go({ type: tab, name: u.hostname + (u.pathname.length > 1 ? u.pathname.slice(0, 30) : ""), url: v });
    } catch {
      setError("الرابط غير صحيح. يجب أن يبدأ بـ https://");
    }
  }

  const placeholder: Record<Exclude<SourceType, "file">, string> = {
    link: "الصق رابط صفحة أو مقال",
    video: "الصق رابط صفحة الفيديو، أو انتقل إلى «نص» والصق نصه المفرّغ",
    text: "الصق نص الدرس هنا",
  };

  return (
    <section className="rounded-[28px] border border-violet/10 bg-white p-6 shadow-xl shadow-violet/5 sm:p-8">
      <p className="text-xs font-medium text-indigo-deep/70">أهلاً {user.name}</p>
      <h1 className="mt-1 text-3xl font-bold leading-snug text-indigo-deep sm:text-[34px]">
        ما الدرس الذي تريد أن يلعبه طلابك؟
      </h1>

      <div role="tablist" className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {TABS.map((t) => {
          const on = tab === t.id;
          const Icon = t.icon;
          // video is not supported yet: it stays visible, marked "soon", and cannot be chosen
          const soon = t.id === "video";
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              disabled={soon}
              title={soon ? "قريبًا: الصق نص الفيديو المفرّغ في تبويب «نص» الآن" : undefined}
              onClick={() => {
                setTab(t.id);
                setValue("");
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-xs font-bold transition ${
                soon
                  ? "cursor-not-allowed border-dashed border-violet/20 bg-white/60 text-indigo-deep/70"
                  : on
                    ? "border-violet bg-violet/10 text-violet"
                    : "border-violet/10 bg-white text-indigo-deep hover:border-violet/30"
              }`}
            >
              {t.label}
              {soon ? <span className="rounded-full bg-violet/10 px-2 py-0.5 text-xs font-bold text-violet">قريبًا</span> : <Icon className="size-3.5 text-violet" />}
            </button>
          );
        })}
      </div>

      {tab === "file" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            onFile(e.dataTransfer.files?.[0]);
          }}
          className={`mt-4 grid min-h-[210px] place-items-center rounded-3xl border-2 border-dashed px-4 py-8 text-center transition ${
            over ? "border-violet bg-violet/10" : "border-violet/30 bg-violet/[0.03]"
          }`}
        >
          <div>
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand text-white shadow-lg shadow-violet/30">
              <Upload className="size-6" strokeWidth={2.5} />
            </span>
            <p className="mt-4 text-lg font-bold text-indigo-deep">اسحب ملف درسك إلى هنا</p>
            <p className="mt-1 text-xs text-indigo-deep/70">أو اختر من جهازك</p>
            <input
              ref={input}
              type="file"
              aria-label="اختر ملف الدرس"
              tabIndex={-1}
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <button
              onClick={() => input.current?.click()}
              className="mt-4 rounded-full bg-brand px-7 py-2.5 text-xs font-bold text-white shadow-md shadow-violet/30"
            >
              اختر ملفًا
            </button>
          </div>
        </div>
      ) : (
        <form className="mt-4 space-y-3" onSubmit={submitText} noValidate>
          {tab === "text" ? (
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={7}
              placeholder={placeholder.text}
              className={`${field} resize-none leading-7`}
            />
          ) : (
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              dir="ltr"
              type="url"
              placeholder={placeholder[tab]}
              className={`${field} text-start`}
            />
          )}
          <button
            disabled={!value.trim()}
            className="rounded-full bg-brand px-8 py-3 text-sm font-bold text-white shadow-md shadow-violet/30 disabled:opacity-40"
          >
            حوّله إلى درس
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold leading-5 text-rose-700">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium text-indigo-deep/70">
          PDF أو Word أو نص أو رابط صفحة. أي مادة، وبأي لغة. (PowerPoint والفيديو قريبًا.)
        </p>
        <span className="rounded-full bg-mint/15 px-3 py-1.5 text-xs font-bold text-emerald-700">
          درسك الأول مجاني وكامل
        </span>
      </div>
    </section>
  );
}
