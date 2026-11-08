"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Check, Zap } from "lucide-react";
import { FlowHeader } from "@/components/teacher/TeacherHeader";
import { useFlow } from "@/components/teacher/FlowProvider";
import { fmtNumber } from "@/lib/format";
import {
  ASSESSMENT_OPTIONS,
  AUDIENCES,
  DISPLAY_OPTIONS,
  GAMIFICATION_OPTIONS,
  MINUTES,
  optionHint,
  type Customization,
} from "@/lib/lesson";

type RowId = "lesson" | "display" | "gamification" | "assessment";

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
        on
          ? "border-violet bg-violet text-white"
          : "border-violet/15 bg-white text-indigo-deep hover:border-violet/40"
      }`}
    >
      {children}
    </button>
  );
}

function Row({
  label,
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  label: string;
  title: string;
  hint: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-violet/10 py-4 last:border-0">
      <div className="flex items-start gap-4">
        <span className="w-[72px] shrink-0 pt-0.5 text-xs font-bold text-violet">{label}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-6 text-indigo-deep">{title}</p>
          <p className="mt-0.5 text-xs leading-5 text-indigo-deep/70">{hint}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="shrink-0 rounded-full border border-violet/15 bg-white px-4 py-1.5 text-xs font-bold text-violet shadow-sm transition hover:border-violet/40"
        >
          {open ? "تم" : "غيّر"}
        </button>
      </div>
      {open && <div className="mt-3 flex flex-wrap gap-2 ps-[88px]">{children}</div>}
    </div>
  );
}

function PreviewCard({ title, c }: { title: string; c: Customization }) {
  const display = c.display === "varied" ? DISPLAY_OPTIONS[0].label : DISPLAY_OPTIONS.find((d) => d.id === c.display)!.label;
  const boxes = [
    { k: "نمط العرض", v: display },
    { k: "إطار التلعيب", v: c.gamification },
    { k: "نمط التقييم", v: c.assessment },
  ];
  return (
    <aside className="dots relative overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-deep to-[#4a1d96] p-4 text-white shadow-xl shadow-indigo-deep/25">
      <p className="relative text-xs font-medium text-white/70">درسك سيكون هكذا</p>
      <h2 className="relative mt-1 text-xl font-bold">{title}</h2>

      <div className="relative mt-3 grid h-[84px] place-items-center overflow-hidden rounded-2xl bg-indigo-deep/70">
        <span className="absolute inset-x-6 top-1/2 h-12 -translate-y-1/2 rounded-[50%] border border-dashed border-white/20" />
        <span className="absolute start-[18%] top-[18%] size-2.5 rounded-full bg-violet-300" />
        <span className="absolute bottom-[16%] end-[12%] size-3 rounded-full bg-sun" />
        <span className="relative grid size-11 place-items-center rounded-2xl bg-brand shadow-lg">
          <BookOpen className="size-5" />
        </span>
      </div>

      <div className="relative mt-3 space-y-2.5">
        {boxes.map((b) => (
          <div key={b.k} className="rounded-2xl bg-white/10 px-3.5 py-3">
            <p className="text-xs font-medium text-white/80">{b.k}</p>
            <p className="mt-0.5 text-xs font-bold leading-5">{b.v}</p>
          </div>
        ))}
      </div>

      <p className="relative mt-3.5 text-xs font-semibold text-white/85">
        5 محطات · 5 تحديات · تحدّي الزعيم · نحو {c.minutes} دقيقة
      </p>
    </aside>
  );
}

export default function CustomizePage() {
  const router = useRouter();
  const { source, custom, setCustom } = useFlow();
  const [open, setOpen] = useState<RowId | null>(null);
  const toggle = (id: RowId) => setOpen((o) => (o === id ? null : id));
  const set = (patch: Partial<Customization>) => setCustom({ ...custom, ...patch });

  // arriving here without a source (a refresh loses the file) means starting again from the dashboard
  useEffect(() => {
    if (!source) router.replace("/dashboard");
  }, [source, router]);

  const displayLabel = DISPLAY_OPTIONS.find((d) => d.id === custom.display)!;
  if (!source) return <FlowHeader current={2} />;

  const fileMeta =
    source.type === "file"
      ? `ملف · ${source.sizeKb! >= 1024 ? (source.sizeKb! / 1024).toFixed(1) + " م.ب" : source.sizeKb + " ك.ب"}`
      : source.type === "text"
        ? `نص · ${fmtNumber(source.text!.length)} حرفًا`
        : source.type === "video"
          ? "رابط فيديو"
          : "رابط صفحة";
  const lessonTitle = source.name.replace(/\.[a-z0-9]{2,4}$/i, "");

  return (
    <>
      <FlowHeader current={2} />
      <main className="mx-auto grid w-full max-w-[1100px] flex-1 items-start gap-6 px-5 py-8 lg:grid-cols-[1fr_300px]">
        <section className="rounded-[28px] border border-violet/10 bg-white p-6 shadow-xl shadow-violet/5 sm:p-8">
          <h1 className="text-[32px] font-bold text-indigo-deep">خصّص درسك</h1>
          <p className="mt-1.5 text-xs text-indigo-deep/70">
            اترك قفزة ترتّبه، أو اختر بنفسك نمط العرض وإطار التلعيب ونمط التقييم.
          </p>

          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-mint/30 bg-mint/10 px-4 py-3.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-mint text-white">
              <Check className="size-4" strokeWidth={3} />
            </span>
            <div className="min-w-0 flex-1">
              <p dir="auto" className="truncate text-sm font-bold text-emerald-800">
                {source.name}
              </p>
              <p className="mt-0.5 text-xs text-emerald-700/80">{fileMeta}</p>
            </div>
            <Link href="/dashboard" className="shrink-0 text-xs font-bold text-emerald-700 underline underline-offset-4">
              استبدل المصدر
            </Link>
          </div>

          <div className="mt-6 rounded-3xl bg-gradient-to-b from-violet/[0.06] to-pink-card/[0.05] p-5">
            <div className="flex items-center gap-3 border-b border-violet/10 pb-4">
              <span className="grid size-10 place-items-center rounded-2xl bg-brand text-white shadow-md shadow-violet/30">
                <Zap className="size-5" fill="currentColor" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-indigo-deep">رتّبنا الدرس لك</h2>
                <p className="text-xs text-indigo-deep/70">اخترنا ما يناسب محتواه وطلابك. ابنِه الآن، أو غيّر أي سطر.</p>
              </div>
            </div>

            <Row
              label="الدرس"
              title={`${custom.audience} · نحو ${custom.minutes} دقيقة`}
              hint="من المرحلة في حسابك، وحجم الملف ولغته."
              open={open === "lesson"}
              onToggle={() => toggle("lesson")}
            >
              <div className="w-full space-y-2.5">
                <div className="flex flex-wrap gap-2">
                  {AUDIENCES.map((a) => (
                    <Chip key={a} on={custom.audience === a} onClick={() => set({ audience: a })}>
                      {a}
                    </Chip>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-indigo-deep/70">المدة</span>
                  {MINUTES.map((m) => (
                    <Chip key={m} on={custom.minutes === m} onClick={() => set({ minutes: m })}>
                      {m} دقيقة
                    </Chip>
                  ))}
                </div>
              </div>
            </Row>

            <Row
              label="نمط العرض"
              title={displayLabel.label}
              hint={displayLabel.hint}
              open={open === "display"}
              onToggle={() => toggle("display")}
            >
              {DISPLAY_OPTIONS.map((d) => (
                <Chip key={d.id} on={custom.display === d.id} onClick={() => set({ display: d.id })}>
                  {d.id === "varied" ? "متنوّع (موصى به)" : d.label.replace(" في كل المحطات", "")}
                </Chip>
              ))}
            </Row>

            <Row
              label="إطار التلعيب"
              title={custom.gamification}
              hint={optionHint(GAMIFICATION_OPTIONS, custom.gamification)}
              open={open === "gamification"}
              onToggle={() => toggle("gamification")}
            >
              {GAMIFICATION_OPTIONS.map((g) => (
                <Chip key={g.label} on={custom.gamification === g.label} onClick={() => set({ gamification: g.label })}>
                  {g.label}
                </Chip>
              ))}
            </Row>

            <Row
              label="نمط التقييم"
              title={custom.assessment}
              hint={optionHint(ASSESSMENT_OPTIONS, custom.assessment)}
              open={open === "assessment"}
              onToggle={() => toggle("assessment")}
            >
              {ASSESSMENT_OPTIONS.map((a) => (
                <Chip key={a.label} on={custom.assessment === a.label} onClick={() => set({ assessment: a.label })}>
                  {a.label}
                </Chip>
              ))}
            </Row>
          </div>

          <button
            onClick={() => router.push("/create/build")}
            className="mt-6 w-full rounded-full bg-brand py-4 text-base font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110"
          >
            ابنِ الدرس
          </button>
          <p className="mt-3 text-center text-xs text-indigo-deep/70">
            هذا درسك المجاني: كامل بكل المزايا، ومعه حصته المباشرة وتقريره.
          </p>
        </section>

        <div className="space-y-3 lg:sticky lg:top-20">
          <PreviewCard title={lessonTitle} c={custom} />
          <p className="rounded-2xl border border-mint/25 bg-mint/10 px-4 py-3 text-xs font-semibold leading-5 text-emerald-800">
            كل محطة تُبنى من صفحتها في ملفك، وما لا مصدر له لا يُولَّد.
          </p>
        </div>
      </main>
    </>
  );
}
