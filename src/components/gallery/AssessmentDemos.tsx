"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pause, Play, Quote, RotateCcw, X } from "lucide-react";
import { PARTS, PartsMap, Stage, type PartId } from "./GalleryShell";

const row =
  "flex w-full items-center rounded-2xl border bg-white px-4 py-3 text-start text-[13px] font-bold text-indigo-deep transition disabled:cursor-default";

function Verdict({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p
      role="status"
      className={`mt-2.5 animate-[pop_.25s_ease-out] rounded-xl px-4 py-2.5 text-[12px] font-bold leading-6 ${ok ? "bg-mint/15 text-emerald-800" : "bg-rose-50 text-rose-800"}`}
    >
      {children}
    </p>
  );
}

function Again({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-violet underline underline-offset-4">
      <RotateCcw className="size-3" />
      جرّب مرة أخرى
    </button>
  );
}

/* ---------- 1. multiple choice ---------- */

const MCQ = [
  { text: "في الكبد", why: "الكبد يتخلّص من الخلايا القديمة، ولا يصنعها عند البالغ." },
  { text: "في نخاع العظم الأحمر", why: "" },
  { text: "في القلب", why: "القلب يضخّ الدم، ولا يصنع خلاياه." },
  { text: "في الطحال", why: "الطحال يتخلّص من الخلايا القديمة، ولا يصنعها." },
];

export function McqDemo() {
  const [pick, setPick] = useState<number | null>(null);
  return (
    <Stage light className="min-h-[300px]">
      <h3 className="text-[15px] font-bold">أين تُصنع خلايا الدم الحمراء في جسم الإنسان البالغ؟</h3>
      <ul className="mt-3 space-y-2">
        {MCQ.map((o, i) => {
          const right = pick !== null && i === 1;
          const wrong = pick === i && i !== 1;
          return (
            <li key={o.text}>
              <button
                onClick={() => pick === null && setPick(i)}
                disabled={pick !== null}
                className={`${row} ${right ? "border-mint border-2 bg-mint/10" : wrong ? "border-rose-300 bg-rose-50" : "border-violet/10 hover:border-violet/40"}`}
              >
                <span className="flex-1">{o.text}</span>
                {right && <Check className="size-4 text-emerald-600" strokeWidth={3} />}
                {wrong && <X className="size-4 text-rose-500" strokeWidth={3} />}
              </button>
            </li>
          );
        })}
      </ul>
      {pick !== null && (
        <>
          <Verdict ok={pick === 1}>{pick === 1 ? "أحسنت! تُصنع في نخاع العظم الأحمر." : MCQ[pick].why}</Verdict>
          <Again onClick={() => setPick(null)} />
        </>
      )}
    </Stage>
  );
}

/* ---------- 2. true / false ---------- */

export function TrueFalseDemo() {
  const [pick, setPick] = useState<boolean | null>(null);
  const right = pick === true;
  return (
    <Stage light className="min-h-[300px]">
      <div className="relative rounded-2xl bg-white px-5 pb-5 pt-6 shadow-sm">
        <span className="absolute -top-2.5 end-4 rounded-full bg-indigo-deep px-3 py-1 text-[10px] font-bold text-white">عبارة</span>
        <Quote className="absolute start-3 top-3 size-5 text-violet/20" />
        <p className="text-[19px] font-bold leading-9 text-indigo-deep">خلايا الدم الحمراء تحمل الأكسجين بالهيموغلوبين.</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {([
          [true, "صحيحة", Check, "emerald"],
          [false, "خاطئة", X, "rose"],
        ] as const).map(([v, label, Icon, tone]) => {
          const chosen = pick === v;
          return (
            <button
              key={label}
              onClick={() => pick === null && setPick(v)}
              disabled={pick !== null}
              className={`grid justify-items-center gap-1.5 rounded-2xl border-2 bg-white py-4 transition disabled:cursor-default ${
                tone === "emerald" ? "border-emerald-200 hover:border-emerald-400" : "border-rose-200 hover:border-rose-400"
              } ${chosen ? (tone === "emerald" ? "!border-emerald-500 bg-emerald-50" : "!border-rose-500 bg-rose-50") : ""}`}
            >
              <span className={`grid size-10 place-items-center rounded-full ${tone === "emerald" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-500"}`}>
                <Icon className="size-5" strokeWidth={3} />
              </span>
              <span className={`text-[20px] font-bold ${tone === "emerald" ? "text-emerald-600" : "text-rose-500"}`}>{label}</span>
            </button>
          );
        })}
      </div>
      {pick !== null && (
        <>
          <Verdict ok={right}>{right ? "أحسنت! الهيموغلوبين هو ما يحمل الأكسجين." : "بل صحيحة: الهيموغلوبين في الخلايا الحمراء هو الذي يحمل الأكسجين."}</Verdict>
          <Again onClick={() => setPick(null)} />
        </>
      )}
    </Stage>
  );
}

/* ---------- 3. drag and drop ---------- */

const DND = [
  { slot: "الرئتان", card: "تلتقط الأكسجين" },
  { slot: "القلب", card: "يضخّ الدم" },
  { slot: "الأنسجة", card: "تُطلق الأكسجين" },
];

export function DragDropDemo() {
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [held, setHeld] = useState<string | null>(null);
  const [miss, setMiss] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const tray = DND.map((d) => d.card).filter((c) => !Object.values(placed).includes(c));
  const done = tray.length === 0;

  function drop(slot: string, card: string | null) {
    if (!card || placed[slot]) return;
    const right = DND.find((d) => d.slot === slot)?.card === card;
    setHeld(null);
    if (right) {
      setPlaced((p) => ({ ...p, [slot]: card }));
      setMiss(null);
      setMsg(Object.keys(placed).length + 1 === DND.length ? { ok: true, text: "أحسنت! كل بطاقة في مكانها." } : null);
    } else {
      setMiss(slot);
      setMsg({ ok: false, text: `«${card}» ليست من عمل ${slot}. جرّب خانة أخرى.` });
      setTimeout(() => setMiss(null), 700);
    }
  }

  return (
    <Stage light className="min-h-[300px]">
      <h3 className="text-[15px] font-bold">ضع كل بطاقة في مكانها.</h3>
      <div className="mt-3 flex min-h-10 flex-wrap gap-2">
        {tray.map((c) => (
          <button
            key={c}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", c)}
            onClick={() => setHeld(held === c ? null : c)}
            aria-pressed={held === c}
            className={`cursor-grab rounded-full border border-dashed px-3.5 py-2 text-[12px] font-bold transition active:cursor-grabbing ${
              held === c ? "border-violet bg-violet text-white ring-4 ring-violet/20" : "border-violet/40 bg-white text-indigo-deep hover:border-violet"
            }`}
          >
            {c}
          </button>
        ))}
        {done && <span className="py-2 text-[12px] font-bold text-emerald-700">لا بطاقات متبقية ✓</span>}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {DND.map((d) => (
          <div key={d.slot} className="rounded-xl border border-violet/10 bg-white p-2.5">
            <p className="mb-1.5 text-[11px] font-bold">{d.slot}</p>
            <button
              onClick={() => held && drop(d.slot, held)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => drop(d.slot, e.dataTransfer.getData("text/plain"))}
              aria-label={`خانة ${d.slot}${placed[d.slot] ? `: ${placed[d.slot]}` : ""}`}
              className={`grid min-h-10 w-full place-items-center rounded-lg border border-dashed px-1 text-[11px] font-bold transition ${
                placed[d.slot]
                  ? "border-mint bg-mint/15 text-emerald-800"
                  : miss === d.slot
                    ? "animate-[shake_.35s] border-rose-400 bg-rose-50 text-rose-600"
                    : held
                      ? "border-violet bg-violet/5 text-violet"
                      : "border-violet/30 text-indigo-deep/40"
              }`}
            >
              {placed[d.slot] ?? "أفلِت هنا"}
            </button>
          </div>
        ))}
      </div>
      {msg && <Verdict ok={msg.ok}>{msg.text}</Verdict>}
      {Object.keys(placed).length > 0 && (
        <Again
          onClick={() => {
            setPlaced({});
            setMsg(null);
            setHeld(null);
          }}
        />
      )}
    </Stage>
  );
}

/* ---------- 4. spot the error ---------- */

const SENTENCES = [
  { text: "تُصنع خلايا الدم الحمراء في نخاع العظم.", wrong: false },
  { text: "للخلية الناضجة نواة كبيرة.", wrong: true },
  { text: "تعيش الخلية نحو 120 يومًا.", wrong: false },
];

export function SpotErrorDemo() {
  const [pick, setPick] = useState<number | null>(null);
  const found = pick !== null && SENTENCES[pick].wrong;
  return (
    <Stage light className="min-h-[300px]">
      <h3 className="text-[15px] font-bold">في هذه الجمل خطأ واحد. اضغطه.</h3>
      <ul className="mt-3 space-y-2">
        {SENTENCES.map((s, i) => {
          const chosen = pick === i;
          return (
            <li key={s.text}>
              <button
                onClick={() => !found && setPick(i)}
                disabled={found}
                className={`${row} ${chosen && s.wrong ? "border-mint border-2 bg-mint/10" : chosen ? "border-rose-300 bg-rose-50" : "border-violet/10 hover:border-violet/40"}`}
              >
                {s.text}
              </button>
            </li>
          );
        })}
      </ul>
      {pick !== null && (
        <>
          <Verdict ok={found}>{found ? "وجدت الخطأ! الخلية الناضجة لا نواة لها، فهذا يترك مكانًا للهيموغلوبين." : "هذه الجملة صحيحة. ابحث مرة أخرى."}</Verdict>
          {found && <Again onClick={() => setPick(null)} />}
        </>
      )}
    </Stage>
  );
}

/* ---------- 5. audio question ---------- */

const OPTIONS_AUDIO = ["الهيموغلوبين", "نخاع العظم", "الطحال", "الصفائح الدموية"];
const CLIP_SECONDS = 7;

export function AudioQuestionDemo() {
  const [left, setLeft] = useState(CLIP_SECONDS);
  const [playing, setPlaying] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const spoke = useRef(false);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          setPlaying(false);
          return CLIP_SECONDS;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing]);

  function toggle() {
    if (playing) {
      setPlaying(false);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      return;
    }
    setLeft(CLIP_SECONDS);
    setPlaying(true);
    // read the description aloud when the browser has a speech voice; the countdown works either way
    if ("speechSynthesis" in window) {
      try {
        const u = new SpeechSynthesisUtterance("بروتين أحمر فيه حديد، يحمل الأكسجين من الرئتين إلى الأنسجة.");
        u.lang = "ar-SA";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
        spoke.current = true;
      } catch {
        /* no voice available */
      }
    }
  }

  const Icon = playing ? Pause : Play;
  const right = pick === 0;
  return (
    <Stage light className="min-h-[300px]">
      <div className="dots relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl bg-gradient-to-l from-[#241356] to-[#5b21b6] px-4 py-3 text-white">
        <span className="relative text-[12px] font-bold">
          {playing ? `يُسمع الآن… 0:0${left}` : `اضغط لتسمع الوصف، 0:0${CLIP_SECONDS}`}
        </span>
        <button
          onClick={toggle}
          aria-label={playing ? "إيقاف" : "تشغيل الوصف"}
          className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white text-violet shadow-lg transition hover:scale-105"
        >
          <Icon className="size-4 fill-current" />
        </button>
      </div>
      <h3 className="mt-3.5 text-[15px] font-bold">ما الذي يصفه المقطع؟</h3>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {OPTIONS_AUDIO.map((o, i) => (
          <button
            key={o}
            onClick={() => pick === null && setPick(i)}
            disabled={pick !== null}
            className={`${row} justify-center ${pick === i ? (i === 0 ? "border-mint border-2 bg-mint/10" : "border-rose-300 bg-rose-50") : pick !== null && i === 0 ? "border-mint border-2 bg-mint/10" : "border-violet/10 hover:border-violet/40"}`}
          >
            {o}
          </button>
        ))}
      </div>
      {pick !== null && (
        <>
          <Verdict ok={right}>{right ? "أحسنت! المقطع يصف الهيموغلوبين." : "ليس هذا. الوصف «بروتين أحمر فيه حديد» هو الهيموغلوبين."}</Verdict>
          <Again onClick={() => setPick(null)} />
        </>
      )}
    </Stage>
  );
}

/* ---------- 6. matching ---------- */

const PAIRS = [
  ["الهيموغلوبين", "يحمل الأكسجين"],
  ["نخاع العظم", "يصنع الخلايا"],
  ["الشكل المقعّر", "يزيد مساحة السطح"],
];
// meanings are shown in a different order than the terms
const MEANING_ORDER = [2, 0, 1];

export function MatchDemo() {
  const [term, setTerm] = useState<number | null>(null);
  const [done, setDone] = useState<number[]>([]);
  const [miss, setMiss] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function pickMeaning(m: number) {
    if (term === null || done.includes(m)) return;
    if (m === term) {
      const next = [...done, m];
      setDone(next);
      setTerm(null);
      setMsg(next.length === PAIRS.length ? { ok: true, text: "أحسنت! كل العناصر متطابقة." } : null);
    } else {
      setMiss(m);
      setMsg({ ok: false, text: `«${PAIRS[m][1]}» ليس وصف «${PAIRS[term][0]}». لم يتطابق هذا الاختيار.` });
      setTimeout(() => setMiss(null), 700);
    }
  }

  return (
    <Stage light className="min-h-[300px]">
      <h3 className="text-[15px] font-bold">طابِق كل عنصر بوصفه.</h3>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <ul className="space-y-2">
          {PAIRS.map(([t], i) => (
            <li key={t}>
              <button
                onClick={() => !done.includes(i) && setTerm(term === i ? null : i)}
                aria-pressed={term === i}
                className={`${row} ${done.includes(i) ? "border-mint bg-mint/10" : term === i ? "border-violet border-2 bg-violet/5" : "border-violet/10 hover:border-violet/40"}`}
              >
                {t}
              </button>
            </li>
          ))}
        </ul>
        <ul className="space-y-2">
          {MEANING_ORDER.map((m) => (
            <li key={m}>
              <button
                onClick={() => pickMeaning(m)}
                className={`flex w-full items-center rounded-2xl border border-dashed px-4 py-3 text-start text-[12px] font-bold transition ${
                  done.includes(m)
                    ? "border-solid border-mint bg-mint/10 text-emerald-800"
                    : miss === m
                      ? "animate-[shake_.35s] border-rose-400 bg-rose-50 text-rose-700"
                      : term !== null
                        ? "border-violet bg-white text-indigo-deep"
                        : "border-violet/35 bg-white text-indigo-deep"
                }`}
              >
                {PAIRS[m][1]}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {msg && <Verdict ok={msg.ok}>{msg.text}</Verdict>}
      {(done.length > 0 || msg) && (
        <Again
          onClick={() => {
            setDone([]);
            setTerm(null);
            setMsg(null);
          }}
        />
      )}
    </Stage>
  );
}

/* ---------- 7. tap on the image ---------- */

export function ImageTapDemo() {
  const [state, setState] = useState<Partial<Record<PartId, "right" | "wrong">>>({});
  const solved = state.hemo === "right";
  const lastWrong = Object.entries(state).find(([, v]) => v === "wrong")?.[0] as PartId | undefined;

  function pick(id: PartId) {
    if (solved) return;
    if (id === "hemo") setState({ hemo: "right" });
    else {
      setState((s) => ({ ...s, [id]: "wrong" }));
      setTimeout(() => setState((s) => (s[id] === "wrong" ? { ...s, [id]: undefined } : s)), 900);
    }
  }

  return (
    <Stage className="min-h-[300px]">
      <h3 className="relative text-[15px] font-bold">اضغط على ما يحمل الأكسجين داخل الخلية.</h3>
      <div className="mt-2">
        <PartsMap onPick={pick} state={state} />
      </div>
      {solved && (
        <p role="status" className="relative mt-1 animate-[pop_.25s_ease-out] rounded-xl bg-white px-4 py-2.5 text-[12px] font-bold text-emerald-700">
          أحسنت! الهيموغلوبين: {PARTS.find((p) => p.id === "hemo")!.text}
        </p>
      )}
      {!solved && lastWrong && (
        <p role="status" className="relative mt-1 animate-[pop_.25s_ease-out] rounded-xl bg-white px-4 py-2.5 text-[12px] font-bold text-rose-700">
          ليس {PARTS.find((p) => p.id === lastWrong)!.label}. جرّب جزءًا آخر.
        </p>
      )}
      {solved && (
        <button onClick={() => setState({})} className="relative mt-2 flex items-center gap-1.5 text-[11px] font-bold text-white underline underline-offset-4">
          <RotateCcw className="size-3" />
          جرّب مرة أخرى
        </button>
      )}
    </Stage>
  );
}

/* ---------- 8. scenario ---------- */

const SCENARIO = [
  { text: "يصل إلى أنسجته أكسجين أقل", why: "" },
  { text: "زادت خلايا دمه البيضاء", why: "الخلايا البيضاء للمناعة، ولا تفسّر نقص الهيموغلوبين." },
  { text: "ارتفع ضغط دمه", why: "ضغط الدم لا يفسّر نقص الهيموغلوبين." },
];

export function ScenarioDemo() {
  const [pick, setPick] = useState<number | null>(null);
  return (
    <Stage light className="min-h-[300px]">
      <p className="rounded-2xl bg-violet/10 px-4 py-3.5 text-[13px] font-bold leading-7 text-violet">يشعر عليّ بتعب دائم، وأظهر تحليله نقص الهيموغلوبين. ما التفسير الأقرب؟</p>
      <ul className="mt-3 space-y-2">
        {SCENARIO.map((o, i) => {
          const right = pick !== null && i === 0;
          const wrong = pick === i && i !== 0;
          return (
            <li key={o.text}>
              <button
                onClick={() => pick === null && setPick(i)}
                disabled={pick !== null}
                className={`${row} ${right ? "border-mint border-2 bg-mint/10" : wrong ? "border-rose-300 bg-rose-50" : "border-violet/10 hover:border-violet/40"}`}
              >
                {o.text}
              </button>
            </li>
          );
        })}
      </ul>
      {pick !== null && (
        <>
          <Verdict ok={pick === 0}>{pick === 0 ? "أحسنت! نقص الهيموغلوبين يعني أن الدم يحمل أكسجين أقل، فيشعر بالتعب." : SCENARIO[pick].why}</Verdict>
          <Again onClick={() => setPick(null)} />
        </>
      )}
    </Stage>
  );
}

/* ---------- 9. quick questions (timer, one mistake ends the round) ---------- */

const QUICK = [
  { text: "تعيش خلية الدم الحمراء نحو عام كامل.", answer: false },
  { text: "الهيموغلوبين يحتوي على الحديد.", answer: true },
  { text: "تُصنع خلايا الدم الحمراء في القلب.", answer: false },
  { text: "الشكل المقعّر يزيد مساحة سطح الخلية.", answer: true },
];

export function QuickDemo() {
  const [i, setI] = useState(0);
  const [state, setState] = useState<"play" | "lost" | "won">("play");
  const [why, setWhy] = useState("");

  function answer(v: boolean) {
    if (state !== "play") return;
    if (v !== QUICK[i].answer) {
      setWhy("خطأ واحد ينهي الجولة.");
      return setState("lost");
    }
    if (i === QUICK.length - 1) setState("won");
    else setI(i + 1);
  }

  function restart() {
    setI(0);
    setState("play");
    setWhy("");
  }

  return (
    <div className="relative flex min-h-[300px] flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-[#5a0620] via-[#9b1342] to-[#d62a76] p-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-white/15 px-3 py-1 text-[12px] font-bold">بلا مؤقّت</span>
        <p className="text-[11px] font-bold">
          العبارة {Math.min(i + 1, QUICK.length)} من {QUICK.length} · خطأ واحد ينهي الجولة
        </p>
      </div>
      <div className="mt-2.5 flex gap-1.5" aria-hidden>
        {QUICK.map((_, k) => (
          <span key={k} className={`h-1 flex-1 rounded-full ${state === "won" || k < i ? "bg-emerald-300" : k === i && state === "play" ? "bg-white" : "bg-white/25"}`} />
        ))}
      </div>

      <div className="flex flex-1 items-center">
        {state === "play" && (
          <p key={i} className="animate-[pop_.25s_ease-out] text-[22px] font-bold leading-9">
            {QUICK[i].text}
          </p>
        )}
        {state === "lost" && (
          <div role="status" className="animate-[pop_.25s_ease-out]">
            <p className="text-[22px] font-bold">{why}</p>
            <p className="mt-1 text-[12px] font-medium text-white/80">وصلت إلى العبارة {i + 1} من {QUICK.length}. أعد الجولة متى شئت.</p>
          </div>
        )}
        {state === "won" && (
          <div role="status" className="animate-[pop_.25s_ease-out]">
            <p className="text-[22px] font-bold">أصبت العبارات الأربع!</p>
            <p className="mt-1 text-[12px] font-medium text-white/80">هكذا يُهزم الزعيم.</p>
          </div>
        )}
      </div>

      {state === "play" ? (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => answer(false)} className="rounded-2xl bg-white py-3.5 text-[18px] font-bold text-[#a3124a] transition hover:bg-white/90">
            خاطئة
          </button>
          <button onClick={() => answer(true)} className="rounded-2xl bg-emerald-500 py-3.5 text-[18px] font-bold text-white transition hover:bg-emerald-400">
            صحيحة
          </button>
        </div>
      ) : (
        <button onClick={restart} className="mx-auto flex items-center gap-2 rounded-full bg-white px-7 py-3 text-[13px] font-bold text-[#a3124a]">
          <RotateCcw className="size-4" />
          أعد الجولة
        </button>
      )}
    </div>
  );
}
