"use client";

import { useState } from "react";
import { Check, Lock, X } from "lucide-react";
import { AR_LETTERS, type BossItem, type Challenge } from "@/lib/lesson";
import type { LiveAnswer } from "@/lib/live-flow";
import { sfx } from "@/lib/sound";

/** a deterministic rotation: server and client agree, and no item sits in its answer position */
const rotate = <T,>(list: T[]): T[] => list.map((_, i) => list[(i + 1) % list.length]);

const submitBtn = "mt-4 w-full rounded-full bg-brand py-3.5 text-sm font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none";

/**
 * Answering in a live lesson: choose, then send. Nothing here says right or wrong, because the teacher decides
 * when the answer is revealed (see LiveReveal below).
 */
export function LiveChallenge({
  challenge,
  boss,
  busy,
  onSubmit,
}: {
  challenge?: Challenge;
  boss?: BossItem[];
  busy: boolean;
  onSubmit: (a: LiveAnswer) => void;
}) {
  const send = (a: LiveAnswer) => {
    sfx.tap();
    onSubmit(a);
  };
  const [choice, setChoice] = useState<number | null>(null);
  const [value, setValue] = useState<boolean | null>(null);
  const [placed, setPlaced] = useState<Record<number, string>>({});
  const [held, setHeld] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<number, number>>({});
  const [term, setTerm] = useState<number | null>(null);
  const [bossVals, setBossVals] = useState<(boolean | null)[]>(() => (boss ?? []).map(() => null));

  if (boss) {
    const ready = bossVals.every((v) => v !== null);
    return (
      <div>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-pink-card text-white">
            <Lock className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-indigo-deep">تحدّي الزعيم</h2>
            <p className="text-xs font-semibold text-indigo-deep/70">اختر صحيحة أو خاطئة لكل عبارة، ثم أرسل.</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2.5">
          {boss.map((b, i) => (
            <li key={i} className="rounded-2xl border border-violet/10 bg-white p-3.5">
              <p className="text-[14px] font-bold leading-6 text-indigo-deep">{b.statement}</p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {([true, false] as const).map((v) => (
                  <button
                    key={String(v)}
                    onClick={() => setBossVals((x) => x.map((y, k) => (k === i ? v : y)))}
                    aria-pressed={bossVals[i] === v}
                    className={`rounded-xl border-2 py-2.5 text-sm font-bold transition ${
                      bossVals[i] === v ? (v ? "border-mint bg-mint/10 text-emerald-700" : "border-rose-400 bg-rose-50 text-[#c0174f]") : "border-violet/10 text-indigo-deep/70 hover:border-violet/30"
                    }`}
                  >
                    {v ? "صحيحة" : "خاطئة"}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <button disabled={!ready || busy} onClick={() => send({ kind: "boss", values: bossVals.map((v) => v === true) })} className={submitBtn}>
          {busy ? "جارٍ الإرسال…" : "أرسل إجاباتي"}
        </button>
      </div>
    );
  }

  if (!challenge) return null;

  if (challenge.kind === "mcq") {
    return (
      <div>
        <h2 className="text-[21px] font-bold leading-snug text-indigo-deep">{challenge.question}</h2>
        <ul className="mt-4 space-y-2.5">
          {challenge.options.map((o, i) => (
            <li key={i}>
              <button
                onClick={() => setChoice(i)}
                aria-pressed={choice === i}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-start text-[15px] font-semibold text-indigo-deep transition ${choice === i ? "border-violet bg-violet/10" : "border-violet/15 bg-white hover:border-violet/40"}`}
              >
                <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${choice === i ? "bg-violet text-white" : "bg-violet/10 text-violet"}`}>{AR_LETTERS[i]}</span>
                {o.text}
              </button>
            </li>
          ))}
        </ul>
        <button disabled={choice === null || busy} onClick={() => send({ kind: "mcq", choice: choice! })} className={submitBtn}>
          {busy ? "جارٍ الإرسال…" : "أرسل إجابتي"}
        </button>
      </div>
    );
  }

  if (challenge.kind === "tf") {
    return (
      <div>
        <h2 className="text-[21px] font-bold leading-snug text-indigo-deep">{challenge.statement}</h2>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {([true, false] as const).map((v) => (
            <button
              key={String(v)}
              onClick={() => setValue(v)}
              aria-pressed={value === v}
              className={`rounded-2xl border-2 py-4 text-base font-bold transition ${value === v ? (v ? "border-mint bg-mint/10 text-emerald-700" : "border-rose-400 bg-rose-50 text-[#c0174f]") : "border-violet/15 bg-white text-indigo-deep hover:border-violet/40"}`}
            >
              {v ? "صحيحة" : "خاطئة"}
            </button>
          ))}
        </div>
        <button disabled={value === null || busy} onClick={() => send({ kind: "tf", value: value! })} className={submitBtn}>
          {busy ? "جارٍ الإرسال…" : "أرسل إجابتي"}
        </button>
      </div>
    );
  }

  if (challenge.kind === "dnd") {
    const cards = rotate(challenge.slots.map((s) => s.card)).filter((c) => !Object.values(placed).includes(c));
    const done = Object.keys(placed).length === challenge.slots.length;
    return (
      <div>
        <h2 className="text-[21px] font-bold leading-snug text-indigo-deep">{challenge.prompt}</h2>
        <p className="mt-1 text-xs font-semibold text-indigo-deep/70">اضغط البطاقة ثم الخانة التي تخصها.</p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {challenge.slots.map((s, i) => (
            <div key={s.label} className="rounded-2xl bg-violet/[0.05] p-3">
              <p className="mb-2 text-xs font-bold text-violet">{s.label}</p>
              <button
                onClick={() =>
                  held
                    ? (setPlaced((p) => {
                        const n = { ...p };
                        for (const k of Object.keys(n)) if (n[+k] === held) delete n[+k];
                        n[i] = held;
                        return n;
                      }),
                      setHeld(null))
                    : placed[i] && setPlaced((p) => {
                        const n = { ...p };
                        delete n[i];
                        return n;
                      })
                }
                aria-label={`خانة ${s.label}${placed[i] ? `: ${placed[i]}` : ""}`}
                className={`grid min-h-12 w-full place-items-center rounded-xl border-2 border-dashed px-2 py-2.5 text-sm font-bold transition ${placed[i] ? "border-violet/40 bg-white text-indigo-deep" : held ? "border-violet bg-white text-violet" : "border-violet/25 text-indigo-deep/70"}`}
              >
                {placed[i] ?? "أفلِت هنا"}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex min-h-11 flex-wrap gap-2">
          {cards.map((c) => (
            <button key={c} onClick={() => setHeld((h) => (h === c ? null : c))} aria-pressed={held === c} className={`rounded-full px-4 py-2 text-sm font-bold shadow-sm transition ${held === c ? "bg-violet text-white ring-4 ring-violet/20" : "bg-white text-indigo-deep ring-1 ring-violet/15 hover:ring-violet/40"}`}>
              {c}
            </button>
          ))}
        </div>
        <button disabled={!done || busy} onClick={() => send({ kind: "dnd", placed: challenge.slots.map((_, i) => placed[i]) })} className={submitBtn}>
          {busy ? "جارٍ الإرسال…" : "أرسل إجابتي"}
        </button>
      </div>
    );
  }

  // matching
  const order = rotate(challenge.pairs.map((_, i) => i));
  const done = Object.keys(links).length === challenge.pairs.length;
  const owner = (m: number) => Object.entries(links).find(([, v]) => v === m)?.[0];
  return (
    <div>
      <h2 className="text-[21px] font-bold leading-snug text-indigo-deep">{challenge.prompt}</h2>
      <p className="mt-1 text-xs font-semibold text-indigo-deep/70">اضغط العنصر ثم وصفه ليتصلا.</p>
      <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2.5">
        <div className="space-y-2.5">
          {challenge.pairs.map((p, i) => (
            <button
              key={p.term}
              onClick={() => setTerm(term === i ? null : i)}
              aria-pressed={term === i}
              className={`flex w-full items-center gap-2 rounded-2xl border-2 px-3.5 py-3 text-start text-[14px] font-bold text-indigo-deep transition ${term === i ? "border-violet bg-violet/10" : links[i] !== undefined ? "border-violet/50 bg-white" : "border-violet/15 bg-white hover:border-violet/40"}`}
            >
              {links[i] !== undefined && <Check className="size-3.5 shrink-0 text-violet" strokeWidth={3.5} />}
              {p.term}
            </button>
          ))}
        </div>
        <div className="space-y-2.5">
          {order.map((m) => (
            <button
              key={m}
              onClick={() => {
                if (term === null) return;
                setLinks((l) => {
                  const n = { ...l };
                  for (const k of Object.keys(n)) if (n[+k] === m) delete n[+k];
                  n[term] = m;
                  return n;
                });
                setTerm(null);
              }}
              className={`block w-full rounded-2xl border-2 px-3.5 py-3 text-start text-sm font-semibold text-indigo-deep transition ${owner(m) !== undefined ? "border-violet/50 bg-violet/[0.04]" : term !== null ? "border-violet/50 bg-white" : "border-violet/15 bg-white"}`}
            >
              {challenge.pairs[m].meaning}
            </button>
          ))}
        </div>
      </div>
      <button disabled={!done || busy} onClick={() => send({ kind: "match", links: challenge.pairs.map((_, i) => links[i]) })} className={submitBtn}>
        {busy ? "جارٍ الإرسال…" : "أرسل إجابتي"}
      </button>
    </div>
  );
}

/** after the teacher reveals: the right answer, and how this student did */
export function LiveReveal({ challenge, boss, outcome, points }: { challenge?: Challenge; boss?: BossItem[]; outcome?: { right: number; of: number }; points: number }) {
  const answered = !!outcome;
  const full = outcome && outcome.right === outcome.of;

  return (
    <div>
      <div role="status" className={`rounded-2xl px-4 py-3 text-sm font-bold ${!answered ? "bg-slate-100 text-slate-700" : full ? "bg-mint/15 text-emerald-800" : outcome!.right > 0 ? "bg-amber-50 text-amber-900" : "bg-rose-50 text-rose-800"}`}>
        {!answered ? "لم ترسل إجابة لهذا التحدي." : full ? `أحسنت! إجابتك صحيحة. +${points} نقاط` : outcome!.of > 1 ? `أصبت ${outcome!.right} من ${outcome!.of}. +${points} نقطة` : "ليست هذه الإجابة. الصحيحة أمامك."}
      </div>

      <div className="mt-3 rounded-2xl border border-violet/10 bg-white p-4">
        <p className="text-xs font-bold text-violet">الإجابة الصحيحة</p>
        {boss ? (
          <ul className="mt-2 space-y-2">
            {boss.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm font-semibold leading-6 text-indigo-deep">
                <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white ${b.answer ? "bg-mint" : "bg-rose-500"}`}>
                  {b.answer ? <Check className="size-3" strokeWidth={3.5} /> : <X className="size-3" strokeWidth={3.5} />}
                </span>
                {b.statement}
              </li>
            ))}
          </ul>
        ) : challenge?.kind === "mcq" ? (
          <>
            <p className="mt-1.5 text-[15px] font-bold text-indigo-deep">{challenge.question}</p>
            <p className="mt-2 rounded-xl bg-mint/10 px-3.5 py-2.5 text-[14px] font-bold text-emerald-800">
              {AR_LETTERS[challenge.correct]}. {challenge.options[challenge.correct].text}
            </p>
            <ul className="mt-2 space-y-1">
              {challenge.options.map((o, i) => i !== challenge.correct && o.explanation && <li key={i} className="text-xs font-medium leading-5 text-indigo-deep/70">• {o.text}: {o.explanation}</li>)}
            </ul>
          </>
        ) : challenge?.kind === "tf" ? (
          <>
            <p className="mt-1.5 text-[15px] font-bold text-indigo-deep">{challenge.statement}</p>
            <p className={`mt-2 rounded-xl px-3.5 py-2.5 text-[14px] font-bold ${challenge.answer ? "bg-mint/10 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{challenge.answer ? "صحيحة" : "خاطئة"}</p>
            {challenge.explanation && <p className="mt-2 text-xs font-medium leading-5 text-indigo-deep/70">{challenge.explanation}</p>}
          </>
        ) : challenge?.kind === "dnd" ? (
          <ul className="mt-2 space-y-1.5">
            {challenge.slots.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-3 rounded-xl bg-mint/10 px-3.5 py-2 text-sm font-bold text-emerald-900">
                <span>{s.label}</span>
                <span>{s.card}</span>
              </li>
            ))}
          </ul>
        ) : challenge?.kind === "match" ? (
          <ul className="mt-2 space-y-1.5">
            {challenge.pairs.map((p) => (
              <li key={p.term} className="flex items-center justify-between gap-3 rounded-xl bg-mint/10 px-3.5 py-2 text-sm font-bold text-emerald-900">
                <span>{p.term}</span>
                <span className="text-end font-semibold">{p.meaning}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
