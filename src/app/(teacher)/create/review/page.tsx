"use client";

import * as plural from "@/lib/plural";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlowHeader } from "@/components/teacher/TeacherHeader";
import { useFlow } from "@/components/teacher/FlowProvider";
import { StationCard } from "@/components/teacher/review/StationCard";
import { ChallengeCard } from "@/components/teacher/review/ChallengeCard";
import { BossCard } from "@/components/teacher/review/BossCard";
import { Outline } from "@/components/teacher/review/Outline";

export default function ReviewPage() {
  const router = useRouter();
  const { lesson, save, setTitle, hasDraft, draftReady, undo, canUndo, autosave } = useFlow();

  // no lesson of yours to review (a bare visit or a lost tab): do not show the built-in sample as if it were yours
  useEffect(() => {
    if (draftReady && !hasDraft) router.replace("/dashboard");
  }, [draftReady, hasDraft, router]);
  // Ctrl/Cmd+Z steps back through the last edits. Inside a text box the browser's own undo (letter by letter) stays in charge.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z" || e.shiftKey) return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement | null)?.isContentEditable) return;
      e.preventDefault();
      undo();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [undo]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveAndShare() {
    setBusy(true);
    setError(null);
    const r = await save("published");
    if (!r.ok) {
      setBusy(false);
      return setError(r.error);
    }
    router.push("/create/share");
  }
  if (!hasDraft) return null;
  const modes = new Set(lesson.stations.map((s) => s.mode)).size;
  const pending = lesson.stations.filter((s) => s.review).length;

  const MODE_WORDS = ["", "نمط عرض واحد", "نمطي عرض", "ثلاثة أنماط عرض", "أربعة أنماط عرض", "خمسة أنماط عرض", "ستة أنماط عرض"];
  const parts = [
    `${plural.stations(lesson.stations.length)} ب${MODE_WORDS[modes]}`,
    `${lesson.stations.length} تحديات`,
    "تحدّي الزعيم",
    pending === 0 ? "لا شيء يحتاج مراجعة" : pending === 1 ? "محطة واحدة تحتاج مراجعة" : `${pending} محطات تحتاج مراجعة`,
  ];

  return (
    <>
      <FlowHeader current={3} />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-6">
        <section className="dots relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl bg-gradient-to-l from-indigo-deep to-[#4a1d96] px-6 py-5 text-white shadow-xl shadow-indigo-deep/25">
          <div className="relative">
            <h1 className="text-2xl font-bold">راجع درسك وعدّله</h1>
            <p className="mt-1.5 text-xs font-medium text-white/80">{parts.join(" · ")}</p>
          </div>
          <div className="relative flex flex-wrap items-center gap-2.5">
            <span role="status" aria-live="polite" className="text-[11px] font-bold text-white/80">
              {autosave === "saving" ? "يحفظ…" : autosave === "saved" ? "حُفظ ✓" : autosave === "error" ? "تعذّر الحفظ التلقائي" : ""}
            </span>
            <button
              onClick={undo}
              disabled={!canUndo}
              title="تراجع عن آخر تعديل (Ctrl+Z)"
              className="rounded-full bg-white/15 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-white/25 disabled:opacity-40"
            >
              تراجع
            </button>
            <Link
              href="/play/preview"
              className="rounded-full bg-white/15 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-white/25"
            >
              جرّبه كطالب
            </Link>
            <button
              onClick={saveAndShare}
              disabled={busy}
              className="rounded-full bg-white px-6 py-2.5 text-xs font-bold text-indigo-deep shadow-md transition hover:bg-white/90 disabled:opacity-60"
            >
              {busy ? "جارٍ الحفظ…" : "شارك"}
            </button>
          </div>
        </section>

        {error && (
          <p role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-xs font-bold leading-6 text-rose-700">
            تعذّر الحفظ: {error}
          </p>
        )}

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_270px]">
          <div className="space-y-5">
            <div className="rounded-[26px] border border-violet/10 bg-white p-5 shadow-lg shadow-violet/5 sm:p-6">
              <label htmlFor="lesson-title" className="mb-1.5 block text-[11px] font-bold text-indigo-deep/60">
                عنوان الدرس
              </label>
              <input
                id="lesson-title"
                value={lesson.title}
                maxLength={80}
                onChange={(e) => setTitle(e.target.value)}
                className="h-12 w-full rounded-2xl border border-violet/10 bg-white px-4 text-lg font-bold text-indigo-deep outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/10"
              />
            </div>
            {lesson.stations.map((s, i) => (
              <div key={s.id} className="space-y-5">
                <StationCard station={s} index={i} />
                <ChallengeCard station={s} index={i} />
              </div>
            ))}
            <BossCard boss={lesson.boss} />
          </div>
          <Outline lesson={lesson} />
        </div>
      </main>
    </>
  );
}
