"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Network } from "lucide-react";
import { api } from "@/lib/client-api";
import type { LessonSummary } from "@/lib/lesson";
import { useFlow } from "./FlowProvider";

function Art({ children }: { children: React.ReactNode }) {
  return (
    <div className="dots relative grid h-[88px] place-items-center overflow-hidden rounded-t-3xl bg-gradient-to-br from-indigo-deep to-[#4a1d96]">
      <span className="absolute start-[28%] top-[22%] size-3 rounded-full bg-violet-300" />
      <span className="absolute bottom-[14%] end-[34%] size-3 rounded-full bg-sun" />
      <span className="relative z-10 grid size-12 place-items-center rounded-2xl bg-brand text-white shadow-lg">{children}</span>
    </div>
  );
}

export function MyLessonsPreview() {
  const router = useRouter();
  const { openSaved } = useFlow();
  const [lessons, setLessons] = useState<LessonSummary[] | null>(null);

  useEffect(() => {
    let current = true;
    api<{ lessons: LessonSummary[] }>("/api/lessons").then((r) => {
      if (current) setLessons(r.ok ? r.data.lessons.filter((l) => !l.archived).slice(0, 2) : []);
    });
    return () => {
      current = false;
    };
  }, []);

  return (
    <section className="mt-9">
      <div className="mb-3 flex items-end gap-3">
        <h2 className="text-2xl font-bold text-indigo-deep">دروسي</h2>
        <Link href="/lessons" className="pb-1 text-xs font-bold text-violet underline underline-offset-4">
          كل الدروس
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {lessons?.map((l) => (
          <button
            key={l.id}
            onClick={async () => (await openSaved(l.id)) && router.push("/create/review")}
            className="overflow-hidden rounded-3xl border border-violet/10 bg-white text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet/10"
          >
            <Art>
              <BookOpen className="size-5" />
            </Art>
            <div className="p-4">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${l.status === "draft" ? "bg-slate-100 text-slate-600" : "bg-mint/15 text-emerald-700"}`}>
                {l.status === "draft" ? "مسودة" : "منشور"}
              </span>
              <h3 className="mt-2 line-clamp-2 text-base font-bold text-indigo-deep">{l.title}</h3>
              <p className="mt-1 text-[11px] text-indigo-deep/55">
                الرمز <span dir="ltr">{l.code}</span> · 5 محطات · 5 تحديات
              </p>
            </div>
          </button>
        ))}

        {lessons?.length === 0 && (
          <div className="grid min-h-[190px] place-items-center rounded-3xl border border-dashed border-violet/25 bg-white/50 p-5 text-center">
            <div>
              <h3 className="text-base font-bold text-indigo-deep">دروسك ستظهر هنا</h3>
              <p className="mt-1.5 text-[11px] leading-5 text-indigo-deep/55">ارفع ملفك الأول بالأعلى، ويجهز في أقل من دقيقة.</p>
            </div>
          </div>
        )}

        <Link
          href="/play/demo"
          className="group relative overflow-hidden rounded-3xl border border-violet/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet/10"
        >
          <Art>
            <Network className="size-5" />
          </Art>
          <span className="absolute end-3 top-3 z-10 rounded-full bg-sun px-3 py-1 text-[10px] font-bold text-indigo-deep">درس نموذجي</span>
          <div className="p-4">
            <h3 className="text-base font-bold text-indigo-deep">جرّبه كطالب في 30 ثانية</h3>
            <p className="mt-1 text-[11px] text-indigo-deep/55">العب درسًا جاهزًا كما سيلعبه طلابك</p>
          </div>
        </Link>
      </div>
    </section>
  );
}
