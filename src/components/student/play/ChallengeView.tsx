"use client";

import { useState } from "react";
import { Check, Lock, X } from "lucide-react";
import { AR_LETTERS, type BossItem, type Challenge } from "@/lib/lesson";
import { POINTS } from "@/lib/play";

type Status = "idle" | "wrong" | "right" | "failed";

type Props = {
  challenge: Challenge;
  /** called after every try; `attempt` is 1 or 2. `choice` is the option picked (multiple choice: its index; true/false: 0 for true, 1 for false) */
  onAttempt: (attempt: 1 | 2, correct: boolean, choice?: number) => void;
  disabled?: boolean;
};

/** deterministic "shuffle" (a rotation), so server and client render the same order and no item sits in its answer position */
const shuffled = <T,>(list: T[], by = 1): T[] => list.map((_, i) => list[(i + by) % list.length]);

function Banner({ status, attempt, extra }: { status: Status; attempt: 1 | 2; extra?: string }) {
  if (status === "idle") return null;
  const good = status === "right";
  return (
    <div
      role="status"
      className={`mt-4 animate-[pop_.25s_ease-out] rounded-2xl px-4 py-3 text-sm font-bold ${
        good ? "bg-mint/15 text-emerald-800" : status === "wrong" ? "bg-amber-50 text-amber-900" : "bg-rose-50 text-rose-800"
      }`}
    >
      {good && `أحسنت! +${attempt === 1 ? POINTS.first : POINTS.second} نقاط${attempt === 2 ? " (من المحاولة الثانية)" : ""}.`}
      {status === "wrong" && `ليست هذه. عندك محاولة ثانية، وخسرت قلبًا.`}
      {status === "failed" && `لا بأس، هذه هي الإجابة الصحيحة. وسيعود إليك هذا السؤال في تثبيت الغد.`}
      {extra && <span className="mt-1 block font-medium opacity-90">{extra}</span>}
    </div>
  );
}

function useAttempts(onAttempt: Props["onAttempt"]) {
  const [attempt, setAttempt] = useState<1 | 2>(1);
  const [status, setStatus] = useState<Status>("idle");
  const resolve = (correct: boolean, choice?: number) => {
    onAttempt(attempt, correct, choice);
    if (correct) setStatus("right");
    else if (attempt === 1) {
      setStatus("wrong");
      setAttempt(2);
    } else setStatus("failed");
  };
  return { attempt, status, resolve, done: status === "right" || status === "failed" };
}

/* ---------- multiple choice ---------- */

function Mcq({ challenge, onAttempt, disabled }: Props & { challenge: Extract<Challenge, { kind: "mcq" }> }) {
  const { attempt, status, resolve, done } = useAttempts(onAttempt);
  const [tried, setTried] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);

  function pick(i: number) {
    if (done || disabled || tried.includes(i)) return;
    setPicked(i);
    setTried((t) => [...t, i]);
    resolve(i === challenge.correct, i);
  }

  const wrongExplanation = picked !== null && picked !== challenge.correct ? challenge.options[picked].explanation : undefined;

  return (
    <>
      <h2 className="text-[22px] font-bold leading-snug text-indigo-deep">{challenge.question}</h2>
      <ul className="mt-4 space-y-2.5">
        {challenge.options.map((o, i) => {
          const isRight = i === challenge.correct;
          const showRight = (status === "right" || status === "failed") && isRight;
          const wasWrong = tried.includes(i) && !isRight;
          return (
            <li key={i}>
              <button
                onClick={() => pick(i)}
                disabled={done || disabled || tried.includes(i)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-start text-[15px] font-semibold transition ${
                  showRight
                    ? "border-mint border-2 bg-mint/10 text-indigo-deep"
                    : wasWrong
                      ? "border-rose-300 bg-rose-50 text-rose-900"
                      : "border-violet/15 bg-white text-indigo-deep hover:border-violet/40 hover:bg-violet/[0.03]"
                } disabled:cursor-default`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                    showRight ? "bg-mint text-white" : wasWrong ? "bg-rose-500 text-white" : "bg-violet/10 text-violet"
                  }`}
                >
                  {showRight ? <Check className="size-4" strokeWidth={3} /> : wasWrong ? <X className="size-4" strokeWidth={3} /> : AR_LETTERS[i]}
                </span>
                {o.text}
              </button>
            </li>
          );
        })}
      </ul>
      <Banner status={status} attempt={attempt} extra={wrongExplanation} />
    </>
  );
}

/* ---------- true / false ---------- */

function TrueFalse({ challenge, onAttempt, disabled }: Props & { challenge: Extract<Challenge, { kind: "tf" }> }) {
  const { attempt, status, resolve, done } = useAttempts(onAttempt);
  const [tried, setTried] = useState<boolean[]>([]);

  function pick(v: boolean) {
    if (done || disabled || tried.includes(v)) return;
    setTried((t) => [...t, v]);
    resolve(v === challenge.answer, v ? 0 : 1);
  }

  const opts: { v: boolean; label: string; letter: string; color: string }[] = [
    { v: true, label: "صحيحة", letter: "صح", color: "#10b981" },
    { v: false, label: "خاطئة", letter: "خطأ", color: "#e11d48" },
  ];

  return (
    <>
      <h2 className="text-[22px] font-bold leading-snug text-indigo-deep">{challenge.statement}</h2>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {opts.map((o) => {
          const showRight = done && o.v === challenge.answer;
          const wasWrong = tried.includes(o.v) && o.v !== challenge.answer;
          return (
            <button
              key={o.label}
              onClick={() => pick(o.v)}
              disabled={done || disabled || tried.includes(o.v)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-4 text-start text-base font-bold transition disabled:cursor-default ${
                showRight ? "border-mint border-2 bg-mint/10" : wasWrong ? "border-rose-300 bg-rose-50 text-rose-900" : "border-violet/15 bg-white text-indigo-deep hover:border-violet/40"
              }`}
            >
              <span className="grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs font-bold text-white" style={{ background: wasWrong ? "#f43f5e" : o.color }}>
                {o.letter}
              </span>
              {o.label}
            </button>
          );
        })}
      </div>
      <Banner status={status} attempt={attempt} extra={status !== "idle" && status !== "right" ? challenge.explanation : undefined} />
    </>
  );
}

/* ---------- drag and drop (drag, or tap a card then a slot) ---------- */

function DragDrop({ challenge, onAttempt, disabled }: Props & { challenge: Extract<Challenge, { kind: "dnd" }> }) {
  const { attempt, status, resolve, done } = useAttempts(onAttempt);
  const [placed, setPlaced] = useState<Record<number, string>>({});
  const [held, setHeld] = useState<string | null>(null);
  const [wrongSlots, setWrongSlots] = useState<number[]>([]);

  const tray = shuffled(challenge.slots.map((s) => s.card), 1).filter((c) => !Object.values(placed).includes(c));
  const allPlaced = Object.keys(placed).length === challenge.slots.length;

  function drop(slot: number, card: string | null) {
    if (done || disabled || !card) return;
    setPlaced((p) => {
      const next = { ...p };
      for (const k of Object.keys(next)) if (next[+k] === card) delete next[+k];
      next[slot] = card;
      return next;
    });
    setHeld(null);
    setWrongSlots([]);
  }

  function check() {
    const wrong = challenge.slots.map((s, i) => (placed[i] === s.card ? -1 : i)).filter((i) => i !== -1);
    resolve(wrong.length === 0);
    if (wrong.length) {
      setWrongSlots(wrong);
      if (attempt === 1) {
        setPlaced((p) => {
          const next = { ...p };
          wrong.forEach((i) => delete next[i]);
          return next;
        });
      } else {
        setPlaced(Object.fromEntries(challenge.slots.map((s, i) => [i, s.card])));
      }
    }
  }

  return (
    <>
      <h2 className="text-[22px] font-bold leading-snug text-indigo-deep">{challenge.prompt}</h2>
      <p className="mt-1 text-xs font-semibold text-indigo-deep/70">اسحب كل بطاقة إلى خانتها، أو اضغط البطاقة ثم الخانة.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {challenge.slots.map((s, i) => {
          const card = placed[i];
          const bad = wrongSlots.includes(i);
          return (
            <div key={s.label} className="rounded-2xl bg-violet/[0.05] p-3">
              <p className="mb-2 text-xs font-bold text-violet">{s.label}</p>
              <button
                onClick={() => (held ? drop(i, held) : card && !done && setPlaced((p) => { const n = { ...p }; delete n[i]; return n; }))}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => drop(i, e.dataTransfer.getData("text/plain"))}
                aria-label={`خانة ${s.label}${card ? `: ${card}` : ""}`}
                className={`grid min-h-14 w-full place-items-center rounded-xl border-2 border-dashed px-3 py-3 text-sm font-bold transition ${
                  card
                    ? done && !bad
                      ? "border-mint bg-mint/15 text-indigo-deep"
                      : bad
                        ? "border-rose-300 bg-rose-50 text-rose-900"
                        : "border-violet/40 bg-white text-indigo-deep"
                    : held
                      ? "border-violet bg-white text-violet"
                      : "border-violet/25 text-indigo-deep/70"
                }`}
              >
                {card ?? "أفلِت هنا"}
              </button>
            </div>
          );
        })}
      </div>
      {!done && (
        <div className="mt-3 flex min-h-11 flex-wrap gap-2">
          {tray.map((c) => (
            <button
              key={c}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", c)}
              onClick={() => setHeld((h) => (h === c ? null : c))}
              aria-pressed={held === c}
              className={`cursor-grab rounded-full px-4 py-2 text-sm font-bold shadow-sm transition active:cursor-grabbing ${
                held === c ? "bg-violet text-white ring-4 ring-violet/20" : "bg-white text-indigo-deep ring-1 ring-violet/15 hover:ring-violet/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {!done && (
        <button
          onClick={check}
          disabled={!allPlaced || disabled}
          className="mt-3 rounded-full bg-brand px-8 py-2.5 text-xs font-bold text-white shadow-md shadow-violet/30 disabled:opacity-40"
        >
          تحقّق
        </button>
      )}
      <Banner status={status} attempt={attempt} extra={status === "wrong" ? "البطاقات الخاطئة عادت إلى مكانها لتجرّب مرة أخرى." : undefined} />
    </>
  );
}

/* ---------- matching ---------- */

const PAIR_COLORS = ["#7b26cc", "#e0307f", "#0ea5e9", "#f59e0b"];

function Matching({ challenge, onAttempt, disabled }: Props & { challenge: Extract<Challenge, { kind: "match" }> }) {
  const { attempt, status, resolve, done } = useAttempts(onAttempt);
  const [links, setLinks] = useState<Record<number, number>>({}); // term index -> meaning index
  const [term, setTerm] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number[]>([]);

  const order = shuffled(challenge.pairs.map((_, i) => i), 1);
  const linkedMeaning = (m: number) => Object.entries(links).find(([, v]) => v === m)?.[0];
  const complete = Object.keys(links).length === challenge.pairs.length;

  function pickMeaning(m: number) {
    if (done || disabled || term === null) return;
    setLinks((l) => {
      const next = { ...l };
      for (const k of Object.keys(next)) if (next[+k] === m) delete next[+k];
      next[term] = m;
      return next;
    });
    setTerm(null);
    setWrong([]);
  }

  function check() {
    const bad = challenge.pairs.map((_, i) => (links[i] === i ? -1 : i)).filter((i) => i !== -1);
    resolve(bad.length === 0);
    if (bad.length) {
      setWrong(bad);
      if (attempt === 1) {
        setLinks((l) => {
          const next = { ...l };
          bad.forEach((i) => delete next[i]);
          return next;
        });
      } else setLinks(Object.fromEntries(challenge.pairs.map((_, i) => [i, i])));
    }
  }

  return (
    <>
      <h2 className="text-[22px] font-bold leading-snug text-indigo-deep">{challenge.prompt}</h2>
      <p className="mt-1 text-xs font-semibold text-indigo-deep/70">اضغط العنصر ثم وصفه ليتصلا.</p>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
        <div className="space-y-2.5">
          {challenge.pairs.map((p, i) => {
            const linked = links[i] !== undefined;
            return (
              <button
                key={p.term}
                onClick={() => !done && !disabled && setTerm(term === i ? null : i)}
                aria-pressed={term === i}
                className={`flex w-full items-center gap-2 rounded-2xl border-2 px-4 py-3 text-start text-[14px] font-bold text-indigo-deep transition ${
                  term === i ? "border-violet bg-violet/10" : wrong.includes(i) ? "border-rose-300 bg-rose-50" : linked ? "bg-white" : "border-violet/15 bg-white hover:border-violet/40"
                }`}
                style={linked && term !== i && !wrong.includes(i) ? { borderColor: PAIR_COLORS[i % 4] } : undefined}
              >
                {linked && <span className="size-2.5 shrink-0 rounded-full" style={{ background: PAIR_COLORS[i % 4] }} />}
                {p.term}
              </button>
            );
          })}
        </div>
        <div className="space-y-2.5">
          {order.map((m) => {
            const owner = linkedMeaning(m);
            return (
              <button
                key={m}
                onClick={() => pickMeaning(m)}
                className={`block w-full rounded-2xl border-2 px-4 py-3 text-start text-sm font-semibold text-indigo-deep transition ${
                  owner === undefined ? `bg-white ${term !== null ? "border-violet/50" : "border-violet/15"} hover:border-violet/50` : "bg-white"
                }`}
                style={owner !== undefined ? { borderColor: PAIR_COLORS[+owner % 4] } : undefined}
              >
                {challenge.pairs[m].meaning}
              </button>
            );
          })}
        </div>
      </div>
      {!done && (
        <button onClick={check} disabled={!complete || disabled} className="mt-3 rounded-full bg-brand px-8 py-2.5 text-xs font-bold text-white shadow-md shadow-violet/30 disabled:opacity-40">
          تحقّق
        </button>
      )}
      <Banner status={status} attempt={attempt} extra={status === "wrong" ? "الأزواج الخاطئة انفصلت لتصلها من جديد." : undefined} />
    </>
  );
}

export function ChallengeView(props: Props) {
  const c = props.challenge;
  if (c.kind === "mcq") return <Mcq {...props} challenge={c} />;
  if (c.kind === "tf") return <TrueFalse {...props} challenge={c} />;
  if (c.kind === "dnd") return <DragDrop {...props} challenge={c} />;
  return <Matching {...props} challenge={c} />;
}

/* ---------- boss round: four statements, one mistake ends it ---------- */

export function BossView({ items, onWin, onRound }: { items: BossItem[]; onWin: () => void; onRound?: () => void }) {
  const [at, setAt] = useState(0);
  const [state, setState] = useState<"playing" | "lost" | "won">("playing");

  function answer(v: boolean) {
    if (v !== items[at].answer) return setState("lost");
    if (at === items.length - 1) {
      setState("won");
      onWin();
    } else setAt(at + 1);
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-pink-card text-white">
          <Lock className="size-5" />
        </span>
        <div>
          <h2 className="text-[22px] font-bold text-indigo-deep">تحدّي الزعيم</h2>
          <p className="text-xs font-semibold text-indigo-deep/70">أربع عبارات: خطأ واحد ينهي الجولة، وتعيدها متى شئت.</p>
        </div>
      </div>

      <div className="mt-4 flex gap-1.5" aria-hidden>
        {items.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${state === "won" || i < at ? "bg-mint" : i === at && state === "playing" ? "bg-violet" : "bg-violet/10"}`} />
        ))}
      </div>

      {state === "playing" && (
        <div key={at} className="mt-4 animate-[pop_.25s_ease-out]">
          <p className="text-xs font-bold text-violet">العبارة {at + 1} من {items.length}</p>
          <p className="mt-1 rounded-2xl bg-pink-card/[0.07] px-5 py-5 text-[20px] font-bold leading-snug text-indigo-deep">{items[at].statement}</p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <button onClick={() => answer(true)} className="rounded-2xl border-2 border-mint/40 bg-white py-3.5 text-base font-bold text-emerald-700 transition hover:bg-mint/10">
              صحيحة
            </button>
            <button onClick={() => answer(false)} className="rounded-2xl border-2 border-rose-300 bg-white py-3.5 text-base font-bold text-[#c0174f] transition hover:bg-rose-50">
              خاطئة
            </button>
          </div>
        </div>
      )}

      {state === "lost" && (
        <div role="status" className="mt-4 animate-[pop_.25s_ease-out] rounded-2xl bg-rose-50 px-5 py-5">
          <p className="text-base font-bold text-rose-800">أخطأت، فانتهت الجولة.</p>
          <p className="mt-1 text-xs font-medium text-rose-800/80">لا شيء يضيع: تعيد الجولة متى شئت.</p>
          <button
            onClick={() => {
              setAt(0);
              setState("playing");
              onRound?.();
            }}
            className="mt-3 rounded-full bg-[#c0174f] px-7 py-2.5 text-xs font-bold text-white"
          >
            أعد الجولة
          </button>
        </div>
      )}

      {state === "won" && (
        <div role="status" className="mt-4 animate-[pop_.25s_ease-out] rounded-2xl bg-mint/15 px-5 py-5">
          <p className="text-base font-bold text-emerald-800">هزمت الزعيم! +{POINTS.boss} نقطة، وبطاقة نادرة، وشارة.</p>
        </div>
      )}
    </div>
  );
}
