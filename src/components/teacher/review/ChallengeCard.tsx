"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import { postJson } from "@/lib/client-api";
import { AR_LETTERS, CHALLENGE_LABELS, type Challenge, type Station } from "@/lib/lesson";
import { useFlow } from "../FlowProvider";
import { challengeText } from "@/lib/source-match";
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
    <label className="mt-1.5 flex items-center gap-1.5 pe-1 text-xs font-medium text-indigo-deep/70">
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
            : "border-violet/15 bg-white text-indigo-deep/70 hover:border-violet/40"
        }`}
      >
        {badge}
      </button>
      <div
        className={`min-w-0 flex-1 rounded-2xl border px-4 py-3 text-sm ${
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
  const { patchChallenge, replaceChallenge, saved } = useFlow();
  const ch = station.challenge;
  const id = station.id;
  const [switching, setSwitching] = useState<Challenge["kind"] | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);

  /** another kind of challenge for this station, written from the station's own content */
  async function switchTo(kind: Challenge["kind"]) {
    if (kind === ch.kind || switching) return;
    setSwitching(kind);
    setSwitchError(null);
    const r = await postJson<{ challenge: Challenge }>("/api/challenge", { kind, title: station.title, content: station.content, keyIdea: station.keyIdea });
    setSwitching(null);
    if (!r.ok) return setSwitchError(r.error);
    replaceChallenge(id, r.data.challenge);
  }

  return (
    <article
      id={`ch-${index}`}
      className="scroll-mt-24 rounded-[26px] border border-violet/10 bg-white p-5 shadow-lg shadow-violet/5 sm:p-6"
    >
      <CardHead icon={Layers} iconClass="bg-brand" page={station.page} from={{ id: saved?.id, query: challengeText(station.challenge) }}>
        <span className="text-sm font-bold text-violet">التحدي {index + 1}</span>
        <span className="rounded-full bg-pink-card/10 px-3 py-1 text-xs font-bold text-pink-card">
          {CHALLENGE_LABELS[ch.kind]}
        </span>
      </CardHead>

      <div className="mt-3" role="group" aria-label="نوع التحدّي">
        <p className="mb-1.5 text-xs font-bold text-indigo-deep/70">نوع التحدّي</p>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CHALLENGE_LABELS) as Challenge["kind"][]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => switchTo(k)}
              disabled={!!switching}
              aria-pressed={ch.kind === k}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition disabled:opacity-60 ${ch.kind === k ? "border-violet bg-violet/10 text-violet" : "border-violet/15 bg-white text-indigo-deep/70 hover:border-violet/40"}`}
            >
              {switching === k ? "جارٍ الكتابة…" : CHALLENGE_LABELS[k]}
            </button>
          ))}
        </div>
        {switching ? (
          <p role="status" className="mt-1.5 text-xs font-medium text-indigo-deep/70">نكتب تحدّيًا جديدًا من محتوى هذه المحطة…</p>
        ) : switchError ? (
          <p role="alert" className="mt-1.5 text-xs font-bold text-[#c0174f]">{switchError}</p>
        ) : (
          <p className="mt-1.5 text-xs font-medium text-indigo-deep/70">اختر نوعًا آخر فنكتب لك تحدّيًا جديدًا من محتوى المحطة، ويحلّ محلّ الحالي.</p>
        )}
      </div>

      {ch.kind === "mcq" && (
        <div className="mt-4">
          <input
            value={ch.question}
            onChange={(e) => patchChallenge(id, { question: e.target.value })}
            aria-label="نص السؤال"
            className={`${inputBase} h-12 text-sm font-bold`}
          />
          <p className="mb-2.5 mt-3.5 text-xs font-semibold text-indigo-deep/70">{HINT}</p>
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
          <p className="mb-2.5 mt-3.5 text-xs font-semibold text-indigo-deep/70">{HINT}</p>
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
                <p className="mb-2 text-xs font-bold text-indigo-deep/70">الخانة: {s.label}</p>
                <input
                  value={s.card}
                  aria-label={`بطاقة خانة ${s.label}`}
                  onChange={(e) =>
                    patchChallenge(id, {
                      slots: ch.slots.map((x, j) => (j === i ? { ...x, card: e.target.value } : x)),
                    })
                  }
                  className={`${inputBase} h-11 text-sm font-bold`}
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
                  className={`${inputBase} h-11 text-sm font-bold`}
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
                  className={`${inputBase} h-11 text-sm`}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
