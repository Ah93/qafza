"use client";

import { useEffect, useState } from "react";
import { Check, Pause, Play, Star } from "lucide-react";
import { PARTS, PartsMap, Stage, type PartId } from "./GalleryShell";

const detailBar = "mt-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-indigo-deep";

/* ---------- 1. interactive diagram ---------- */

export function DiagramDemo() {
  const [sel, setSel] = useState<PartId>("hemo");
  const part = PARTS.find((p) => p.id === sel)!;
  return (
    <Stage>
      <PartsMap selected={sel} onPick={setSel} />
      <p className={detailBar} aria-live="polite">
        <b className="text-violet">{part.label}:</b> {part.text}
      </p>
    </Stage>
  );
}

/* ---------- 2. interactive slides ---------- */

const SLIDE_POINTS = [
  ["ما هي", "أكثر خلايا الدم عددًا"],
  ["الشكل", "قرص مقعّر من الجانبين"],
  ["الحجم", "نحو 7 إلى 8 ميكرومترات"],
  ["العمر", "نحو 120 يومًا"],
  ["الوظيفة", "نقل الأكسجين"],
  ["السرّ", "الهيموغلوبين، بروتين فيه حديد"],
];

export function SlidesDemo() {
  const [shown, setShown] = useState(1);
  const done = shown === SLIDE_POINTS.length;
  return (
    <Stage className="flex flex-col">
      <div className="flex items-start justify-between">
        <h3 className="text-[22px] font-bold">خلايا الدم الحمراء</h3>
        <span className="text-xs font-semibold text-white/70">
          الشريحة {shown} من {SLIDE_POINTS.length}
        </span>
      </div>
      <ol className="relative mt-3 flex-1 space-y-2">
        {SLIDE_POINTS.slice(0, shown).map(([h, b], i) => (
          <li key={h} className="flex animate-[pop_.3s_ease-out] items-center gap-2.5 rounded-xl bg-white/10 px-3.5 py-2.5 text-sm font-medium">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-sun text-xs font-bold text-indigo-deep">{i + 1}</span>
            <span>
              {h}: {b}
            </span>
          </li>
        ))}
      </ol>
      <div className="relative mt-2 flex justify-center">
        <button
          onClick={() => setShown(done ? 1 : shown + 1)}
          className="rounded-full bg-white/15 px-5 py-2 text-xs font-bold transition hover:bg-white/25"
        >
          {done ? "ابدأ من جديد" : "اكشف النقطة التالية"}
        </button>
      </div>
    </Stage>
  );
}

/* ---------- 3. video ---------- */

const CHAPTERS = [
  { at: 0, label: "المقدمة", line: "خلايا الدم الحمراء هي ناقلات الأكسجين في الجسم." },
  { at: 40, label: "الوظيفة", line: "تلتقط الأكسجين في الرئتين وتطلقه في الأنسجة." },
  { at: 85, label: "المفاهيم", line: "الهيموغلوبين بروتين فيه حديد، وهو سرّ اللون الأحمر." },
];
const VIDEO_END = 120;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function VideoDemo() {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setT((v) => {
        if (v >= VIDEO_END) {
          setPlaying(false);
          return VIDEO_END;
        }
        return v + 1;
      });
    }, 500); // two video seconds per real second, so the demo is quick to try
    return () => clearInterval(id);
  }, [playing]);

  const chapter = CHAPTERS.reduce((c, ch, i) => (t >= ch.at ? i : c), 0);
  const Icon = playing ? Pause : Play;

  return (
    <Stage className="flex flex-col p-0">
      <div className="relative flex flex-1 items-center justify-center">
        <span className="absolute start-[16%] top-[20%] size-3 rotate-45 bg-violet-300/90" />
        <span className="absolute end-[22%] top-[14%] size-3 rounded-full bg-teal-300" />
        <span className="absolute bottom-[26%] start-[12%] size-3.5 rotate-12 rounded-sm bg-pink-400" />
        <span className="absolute bottom-[30%] end-[18%] size-4 rotate-45 bg-sun" />
        <span aria-hidden className="absolute inset-x-10 top-1/2 h-28 -translate-y-1/2 rounded-[50%] border border-dashed border-white/15" />
        <button
          onClick={() => {
            if (t >= VIDEO_END) setT(0);
            setPlaying((p) => !p);
          }}
          aria-label={playing ? "إيقاف مؤقت" : "تشغيل"}
          className="relative grid size-[60px] place-items-center rounded-full bg-white text-violet shadow-xl shadow-pink-500/30 transition hover:scale-105"
        >
          <Icon className="size-6 fill-current" />
        </button>
        {(playing || t > 0) && (
          <p className="absolute inset-x-4 bottom-2 animate-[pop_.3s_ease-out] rounded-lg bg-black/40 px-3 py-1.5 text-center text-xs font-medium" aria-live="polite">
            {CHAPTERS[chapter].line}
          </p>
        )}
      </div>
      <div className="h-1 bg-white/10">
        <div className="h-full bg-brand transition-[width] duration-500 ease-linear" style={{ width: `${(t / VIDEO_END) * 100}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-2 bg-black/20 p-2.5">
        {CHAPTERS.map((c, i) => (
          <button
            key={c.label}
            onClick={() => {
              setT(c.at);
              setPlaying(true);
            }}
            aria-pressed={chapter === i}
            className={`rounded-xl px-3 py-2 text-start transition ${chapter === i ? "bg-white text-indigo-deep" : "bg-white/10 hover:bg-white/15"}`}
          >
            <span className="block text-xs font-semibold opacity-70">{clock(c.at)}</span>
            <span className="block text-xs font-bold">{c.label}</span>
          </button>
        ))}
      </div>
    </Stage>
  );
}

/* ---------- 4. cards ---------- */

const FLASH = [
  ["الهيموغلوبين", "بروتين فيه حديد يحمل الأكسجين"],
  ["نخاع العظم", "نسيج داخل العظام يصنع الخلايا"],
  ["الشكل المقعّر", "يزيد مساحة السطح لتبادل الأكسجين"],
];

export function CardsDemo() {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  return (
    <Stage className="flex flex-col items-center justify-center gap-4">
      <button
        onClick={() => setFlip((f) => !f)}
        aria-label="اقلب البطاقة"
        className="relative grid h-[130px] w-[66%] min-w-[210px] place-items-center rounded-3xl bg-white px-4 text-center text-indigo-deep shadow-2xl transition hover:-translate-y-0.5"
      >
        {flip ? (
          <span className="animate-[pop_.25s_ease-out] text-[17px] font-bold leading-8">{FLASH[i][1]}</span>
        ) : (
          <span>
            <span className="block text-[32px] font-bold leading-tight">{FLASH[i][0]}</span>
            <span className="mt-1 block text-xs font-medium text-indigo-deep/70">اضغط لتقلبها</span>
          </span>
        )}
      </button>
      <div className="relative flex items-center gap-3 text-xs font-bold">
        <span>
          البطاقة {i + 1} من {FLASH.length}
        </span>
        <button
          onClick={() => {
            setI((i + 1) % FLASH.length);
            setFlip(false);
          }}
          className="rounded-full bg-white/15 px-5 py-2 transition hover:bg-white/25"
        >
          التالية
        </button>
      </div>
    </Stage>
  );
}

/* ---------- 5. mission path ---------- */

const PATH = [
  { label: "التعريف", text: "ما خلايا الدم الحمراء؟", dy: 0 },
  { label: "البطاقة", text: "بطاقة تعريف الخلية.", dy: 12 },
  { label: "الرحلة", text: "رحلة الأكسجين في الجسم.", dy: 4 },
  { label: "الشكل", text: "لماذا هذا الشكل؟", dy: -26 },
  { label: "المفاهيم", text: "مفاهيم مهمة.", dy: -38 },
  { label: "الزعيم", text: "تحدّي الزعيم الأخير.", dy: -20 },
];

export function PathDemo() {
  const [cur, setCur] = useState(2);
  const n = PATH.length;
  // node centres in a 600 x 150 box; the first stop is on the right (RTL)
  const pts = PATH.map((p, i) => ({ x: 560 - i * (520 / (n - 1)), y: 92 + p.dy }));
  const d = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `S${(pts[i - 1].x + p.x) / 2},${(pts[i - 1].y + p.y) / 2 + (i % 2 ? 10 : -10)} ${p.x},${p.y}`)).join(" ");

  return (
    <Stage light className="flex flex-col">
      <div className="relative h-[150px]" dir="ltr">
        <svg viewBox="0 0 600 150" className="absolute inset-0 size-full" aria-hidden>
          <path d={d} fill="none" stroke="rgba(123,38,204,.25)" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
          <path d={pts.slice(0, cur + 1).map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(" ")} fill="none" stroke="url(#pg)" strokeWidth="3.5" strokeLinecap="round" />
          <defs>
            <linearGradient id="pg" x1="1" x2="0">
              <stop offset="0" stopColor="#7b26cc" />
              <stop offset="1" stopColor="#c8238a" />
            </linearGradient>
          </defs>
        </svg>
        {PATH.map((p, i) => {
          const done = i < cur;
          const here = i === cur;
          const boss = i === n - 1;
          return (
            <button
              key={p.label}
              onClick={() => setCur(i)}
              aria-label={`${p.label}${here ? " (الحالية)" : done ? " (مكتملة)" : ""}`}
              aria-current={here ? "step" : undefined}
              style={{ left: `${(pts[i].x / 600) * 100}%`, top: `${(pts[i].y / 150) * 100}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
            >
              <span
                className={`grid place-items-center rounded-full font-bold transition ${
                  boss
                    ? "size-11 bg-pink-card text-white [clip-path:polygon(30%_0,70%_0,100%_30%,100%_70%,70%_100%,30%_100%,0_70%,0_30%)]"
                    : here
                      ? "size-12 bg-sun text-lg text-indigo-deep ring-8 ring-sun/30"
                      : done
                        ? "size-9 bg-violet text-white"
                        : "size-9 border-2 border-violet/15 bg-white text-sm text-violet/75"
                }`}
              >
                {boss ? <Star className="size-5 fill-white" /> : done ? <Check className="size-4" strokeWidth={3.5} /> : i + 1}
              </span>
              <span dir="rtl" className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-indigo-deep">
                {p.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex flex-wrap justify-center gap-1.5">
        {PATH.map((p, i) => (
          <button
            key={p.label}
            onClick={() => setCur(i)}
            aria-pressed={cur === i}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${cur === i ? "border-violet bg-violet text-white" : "border-violet/15 bg-white text-indigo-deep hover:border-violet/40"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-2.5 rounded-xl border border-violet/10 bg-white px-4 py-3 text-sm font-medium" aria-live="polite">
        <b className="text-violet">{PATH[cur].label}:</b> {PATH[cur].text}
      </p>
    </Stage>
  );
}

/* ---------- 6. simulation ---------- */

const LEVELS = [
  { label: "هيموغلوبين منخفض", oxygen: 45 },
  { label: "متوسط", oxygen: 75 },
  { label: "طبيعي", oxygen: 100 },
];
const CELLS = 52;

export function SimulationDemo() {
  const [lv, setLv] = useState(0);
  const { oxygen } = LEVELS[lv];
  const green = Math.round((oxygen / 100) * CELLS);
  return (
    <Stage>
      <h3 className="text-[19px] font-bold">جرّب: ماذا لو قلّ الهيموغلوبين؟</h3>
      <div role="radiogroup" aria-label="مستوى الهيموغلوبين" className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-white/10 p-1">
        {LEVELS.map((l, i) => (
          <button
            key={l.label}
            role="radio"
            aria-checked={lv === i}
            onClick={() => setLv(i)}
            className={`rounded-full py-2 text-xs font-bold transition ${lv === i ? "bg-white text-indigo-deep" : "text-white/80 hover:text-white"}`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div className="mt-3.5 flex flex-wrap gap-1" aria-hidden>
        {Array.from({ length: CELLS }, (_, i) => (
          <span key={i} className={`size-3.5 rounded-[4px] transition-colors duration-300 ${i < green ? "bg-emerald-300" : "bg-pink-400/60"}`} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5" aria-live="polite">
        <p className="rounded-xl bg-white/10 px-4 py-3 text-xs font-bold">
          أكسجين يصل: <span className="text-emerald-300">{oxygen}%</span>
        </p>
        <p className="rounded-xl bg-white/10 px-4 py-3 text-xs font-bold">
          نقص: <span className="text-pink-300">{100 - oxygen}%</span>
        </p>
      </div>
    </Stage>
  );
}

/* ---------- 7. audio ---------- */

const AUDIO_LINES = ["الهيموغلوبين بروتين أحمر فيه حديد.", "يلتقط الأكسجين في الرئتين،", "ويطلقه في الأنسجة حيث تحتاجه الخلايا."];
const WAVE = [14, 22, 10, 26, 12, 8, 24, 18, 10, 28, 16, 8, 26, 22, 12, 30, 18, 10, 24, 26, 14, 20, 12, 8];

export function AudioDemo() {
  const [playing, setPlaying] = useState(false);
  const [line, setLine] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setLine((l) => {
        if (l >= AUDIO_LINES.length - 1) {
          setPlaying(false);
          return 0;
        }
        return l + 1;
      });
    }, 2200);
    return () => clearInterval(id);
  }, [playing]);

  const Icon = playing ? Pause : Play;
  return (
    <Stage>
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (!playing) setLine(0);
            setPlaying((p) => !p);
          }}
          aria-label={playing ? "إيقاف" : "تشغيل الشرح المسموع"}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-violet shadow-lg transition hover:scale-105"
        >
          <Icon className="size-5 fill-current" />
        </button>
        <div dir="ltr" className="flex h-9 flex-1 items-center gap-[3px]" aria-hidden>
          {WAVE.map((h, i) => (
            <span
              key={i}
              className="w-1.5 shrink-0 rounded-full bg-white/60"
              style={{
                height: h,
                animation: playing ? `wave .9s ease-in-out ${i * 0.04}s infinite alternate` : undefined,
              }}
            />
          ))}
        </div>
      </div>
      <ol className="mt-3 space-y-2" aria-live="polite">
        {AUDIO_LINES.map((l, i) => (
          <li
            key={l}
            className={`rounded-xl px-4 py-3 transition-all duration-300 ${i === line ? "bg-white/20 text-[15px] font-bold" : "bg-white/[0.07] text-sm font-medium text-white/80"}`}
          >
            {l}
          </li>
        ))}
      </ol>
    </Stage>
  );
}

/* ---------- 8. infographic ---------- */

const INFO = [
  ["1", "الشكل المقعّر", "يزيد مساحة السطح لتبادل الأكسجين.", "text-sun"],
  ["2", "الغشاء المرن", "يسمح بالمرور في الشعيرات الضيقة.", "text-pink-300"],
  ["3", "الهيموغلوبين", "بروتين فيه حديد يحمل الأكسجين.", "text-teal-300"],
  ["4", "السيتوبلازم", "سائل الخلية الذي يحمل الهيموغلوبين.", "text-violet-300"],
  ["5", "غياب النواة", "يفسح مكانًا أكبر للهيموغلوبين.", "text-orange-300"],
  ["6", "الحجم الصغير", "نحو 7 إلى 8 ميكرومترات.", "text-emerald-300"],
] as const;

export function InfographicDemo() {
  const [sel, setSel] = useState(0);
  return (
    <Stage>
      <div className="grid grid-cols-3 gap-2">
        {INFO.map(([n, label, , tone], i) => (
          <button
            key={label}
            onClick={() => setSel(i)}
            aria-pressed={sel === i}
            className={`rounded-xl border px-2 py-2.5 text-center transition ${sel === i ? "border-white/70 bg-white/20" : "border-white/10 bg-white/[0.07] hover:bg-white/10"}`}
          >
            <span className={`block text-[22px] font-bold leading-none ${tone}`}>{n}</span>
            <span className="mt-1.5 block text-xs font-bold">{label}</span>
          </button>
        ))}
      </div>
      <p className={`${detailBar} mt-3`} aria-live="polite">
        <b className="text-violet">{INFO[sel][1]}:</b> {INFO[sel][2]}
      </p>
    </Stage>
  );
}

/* ---------- 9. timeline ---------- */

const TL = [
  ["الرئتان", "يلتقط الهيموغلوبين الأكسجين."],
  ["القلب", "يضخّ الدم المحمّل بالأكسجين."],
  ["الشرايين", "تحمله إلى أنحاء الجسم."],
  ["الأنسجة", "تُطلق الخلايا الأكسجين وتأخذ ثاني أكسيد الكربون."],
  ["الأوردة", "تعيد الدم إلى القلب ثم الرئتين."],
];

export function TimelineDemo() {
  const [at, setAt] = useState(2);
  return (
    <Stage>
      <ol className="relative flex items-start justify-between pt-2">
        <span aria-hidden className="absolute inset-x-6 top-[26px] border-t border-dotted border-white/30" />
        {TL.map(([label], i) => (
          <li key={label} className="relative z-10 flex flex-1 flex-col items-center gap-1.5" aria-current={at === i ? "step" : undefined}>
            <button
              onClick={() => setAt(i)}
              aria-label={`${i + 1}: ${label}`}
              className={`grid size-9 place-items-center rounded-full text-sm font-bold transition ${
                at === i ? "bg-sun text-indigo-deep ring-4 ring-sun/30" : i < at ? "bg-white text-violet" : "bg-white/15 text-white"
              }`}
            >
              {i + 1}
            </button>
            <span className="text-xs font-bold">{label}</span>
          </li>
        ))}
      </ol>
      <div key={at} className="mt-4 animate-[pop_.25s_ease-out] rounded-xl bg-white/15 px-4 py-3.5" aria-live="polite">
        <p className="text-[18px] font-bold">{TL[at][0]}</p>
        <p className="mt-0.5 text-sm font-medium text-white/85">{TL[at][1]}</p>
      </div>
    </Stage>
  );
}

/* ---------- 10. dialogue ---------- */

const CHAT = [
  ["ط", "لماذا الخلية مقعّرة من الجانبين؟"],
  ["م", "لتزيد مساحة سطحها، فيدخلها الأكسجين أسرع."],
  ["ط", "ولماذا ليس لها نواة؟"],
  ["م", "ليتّسع المكان لمزيد من الهيموغلوبين."],
] as const;

export function DialogueDemo() {
  const [shown, setShown] = useState(2);
  const done = shown === CHAT.length;
  return (
    <Stage light className="flex flex-col">
      <ul className="flex-1 space-y-2.5" aria-live="polite">
        {CHAT.slice(0, shown).map(([who, text], i) => {
          const guide = who === "م";
          return (
            <li key={i} dir="ltr" className={`flex animate-[pop_.3s_ease-out] items-center gap-2 ${guide ? "justify-end" : "justify-start"}`}>
              {!guide && (
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-pink-400 text-xs font-bold text-white" title="الطالب">
                  {who}
                </span>
              )}
              <p dir="rtl" className={`rounded-2xl px-4 py-2.5 text-sm font-bold ${guide ? "bg-white text-indigo-deep shadow-sm" : "bg-violet text-white"}`}>
                {text}
              </p>
              {guide && (
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sun text-xs font-bold text-indigo-deep" title="المرشد">
                  {who}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex justify-center">
        <button
          onClick={() => setShown(done ? 2 : shown + 1)}
          className="rounded-full bg-white px-6 py-2 text-xs font-bold text-violet shadow-sm transition hover:shadow-md"
        >
          {done ? "ابدأ الحوار من جديد" : "تابع الحوار"}
        </button>
      </div>
    </Stage>
  );
}
