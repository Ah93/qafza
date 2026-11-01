"use client";

import { Layers } from "lucide-react";
import { AR_LETTERS, CHALLENGE_LABELS, type Station } from "@/lib/lesson";
import { useFlow } from "../FlowProvider";
import { Arrow, CardHead, inputBase } from "./parts";

const HINT = "اضغط الحرف لتجعل الخيار هو الصحيح. ولكل خيار خاطئ شرحه.";

function Explanation({
  value,
  onChange,
  label = "شرح الخطأ:",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <label className="mt-1.5 flex items-center gap-1.5 pe-1 text-[11px] font-medium text-indigo-deep/55">
      <span className="shrink-0">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="شرح الخطأ"
        className="min-w-0 flex-1 bg-transparent outline-none focus:text-indigo-deep"
      />
    </label>
  );
}

function ChoiceRow({
  badge,
  correct,
  onPick,
  children,
  badgeLabel,
}: {
  badge: string;
  correct: boolean;
  onPick: () => void;
  badgeLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        onClick={onPick}
        aria-pressed={correct}
        aria-label={badgeLabel}
        className={`grid size-11 shrink-0 place-items-center rounded-xl border text-sm font-bold transition ${
          correct
            ? "border-mint bg-mint text-white shadow-md shadow-mint/30"
            : "border-violet/15 bg-white text-indigo-deep/55 hover:border-violet/40"
        }`}
      >
        {badge}
      </button>
      <div
        className={`min-w-0 flex-1 rounded-2xl border px-4 py-3 text-[13px] ${
          correct ? "border-mint border-2 bg-mint/5 font-bold text-indigo-deep" : "border-violet/10 bg-white text-indigo-deep"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

const textInput = "w-full bg-transparent outline-none";

export function ChallengeCard({ station, index }: { station: Station; index: number }) {
  const { patchChallenge } = useFlow();
  const ch = station.challenge;
  const id = station.id;

  return (
    <article
      id={`ch-${index}`}
      className="scroll-mt-24 rounded-[26px] border border-violet/10 bg-white p-5 shadow-lg shadow-violet/5 sm:p-6"
    >
      <CardHead icon={Layers} iconClass="bg-brand" page={station.page}>
        <span className="text-sm font-bold text-violet">التحدي {index + 1}</span>
        <span className="rounded-full bg-pink-card/10 px-3 py-1 text-[11px] font-bold text-pink-card">
          {CHALLENGE_LABELS[ch.kind]}
        </span>
      </CardHead>

      {ch.kind === "mcq" && (
        <div className="mt-4">
          <input
            value={ch.question}
            onChange={(e) => patchChallenge(id, { question: e.target.value })}
            aria-label="نص السؤال"
            className={`${inputBase} h-12 text-sm font-bold`}
          />
          <p className="mb-2.5 mt-3.5 text-[11px] font-semibold text-indigo-deep/55">{HINT}</p>
          <div className="space-y-3">
            {ch.options.map((o, i) => {
              const correct = ch.correct === i;
              return (
                <div key={i}>
                  <ChoiceRow
                    badge={AR_LETTERS[i]}
                    badgeLabel={`اجعل الخيار ${AR_LETTERS[i]} هو الصحيح`}
                    correct={correct}
                    onPick={() => patchChallenge(id, { correct: i })}
                  >
                    <input
                      value={o.text}
                      aria-label={`الخيار ${AR_LETTERS[i]}`}
                      onChange={(e) =>
                        patchChallenge(id, {
                          options: ch.options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)),
                        })
                      }
                      className={textInput}
                    />
                  </ChoiceRow>
                  {!correct && (
                    <div className="ps-0 pe-[54px]">
                      <Explanation
                        value={o.explanation}
                        onChange={(v) =>
                          patchChallenge(id, {
                            options: ch.options.map((x, j) => (j === i ? { ...x, explanation: v } : x)),
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ch.kind === "tf" && (
        <div className="mt-4">
          <input
            value={ch.statement}
            onChange={(e) => patchChallenge(id, { statement: e.target.value })}
            aria-label="العبارة"
            className={`${inputBase} h-12 text-sm font-bold`}
          />
          <p className="mb-2.5 mt-3.5 text-[11px] font-semibold text-indigo-deep/55">{HINT}</p>
          <div className="space-y-3">
            <ChoiceRow
              badge="ص"
              badgeLabel="اجعل العبارة صحيحة"
              correct={ch.answer}
              onPick={() => patchChallenge(id, { answer: true })}
            >
              صحيحة
            </ChoiceRow>
            <div>
              <ChoiceRow
                badge="خ"
                badgeLabel="اجعل العبارة خاطئة"
                correct={!ch.answer}
                onPick={() => patchChallenge(id, { answer: false })}
              >
                خاطئة
              </ChoiceRow>
              <div className="pe-[54px]">
                <Explanation value={ch.explanation} onChange={(v) => patchChallenge(id, { explanation: v })} />
              </div>
            </div>
          </div>
        </div>
      )}

      {ch.kind === "dnd" && (
        <div className="mt-4">
          <input
            value={ch.prompt}
            onChange={(e) => patchChallenge(id, { prompt: e.target.value })}
            aria-label="التعليمة"
            className={`${inputBase} h-12 text-sm font-bold`}
          />
          <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
            {ch.slots.map((s, i) => (
              <div key={i} className="rounded-2xl border border-violet/10 bg-violet/[0.04] p-3">
                <p className="mb-2 text-[11px] font-bold text-indigo-deep/55">الخانة: {s.label}</p>
                <input
                  value={s.card}
                  aria-label={`بطاقة خانة ${s.label}`}
                  onChange={(e) =>
                    patchChallenge(id, {
                      slots: ch.slots.map((x, j) => (j === i ? { ...x, card: e.target.value } : x)),
                    })
                  }
                  className={`${inputBase} h-11 text-[13px] font-bold`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {ch.kind === "match" && (
        <div className="mt-4">
          <input
            value={ch.prompt}
            onChange={(e) => patchChallenge(id, { prompt: e.target.value })}
            aria-label="التعليمة"
            className={`${inputBase} h-12 text-sm font-bold`}
          />
          <div className="mt-3.5 space-y-2.5">
            {ch.pairs.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
                <input
                  value={p.term}
                  aria-label={`العنصر ${i + 1}`}
                  onChange={(e) =>
                    patchChallenge(id, {
                      pairs: ch.pairs.map((x, j) => (j === i ? { ...x, term: e.target.value } : x)),
                    })
                  }
                  className={`${inputBase} h-11 text-[13px] font-bold`}
                />
                <Arrow />
                <input
                  value={p.meaning}
                  aria-label={`وصف العنصر ${i + 1}`}
                  onChange={(e) =>
                    patchChallenge(id, {
                      pairs: ch.pairs.map((x, j) => (j === i ? { ...x, meaning: e.target.value } : x)),
                    })
                  }
                  className={`${inputBase} h-11 text-[13px]`}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
