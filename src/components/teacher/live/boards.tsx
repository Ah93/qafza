"use client";

import { QRCodeSVG } from "qrcode.react";
import { Check, Lock } from "lucide-react";
import { AR_LETTERS, type Challenge, type Lesson, type Station } from "@/lib/lesson";
import { ANSWER_CARDS, type Group } from "@/lib/live";

/* ---------- shared frame ---------- */

export function BoardFrame({
  label,
  right,
  children,
  center,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <section
      aria-label="السبورة"
      className="dots relative min-h-[520px] overflow-hidden rounded-[28px] bg-gradient-to-b from-[#271456] to-[#481d91] p-6 text-white shadow-2xl shadow-indigo-deep/30 sm:p-7"
    >
      <div className="relative z-10 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold text-white/75">{label}</p>
        <div className="flex flex-wrap gap-2">{right}</div>
      </div>
      <div className={`relative z-10 ${center ? "grid min-h-[430px] place-items-center" : "mt-6"}`}>{children}</div>
    </section>
  );
}

export function ScorePills({ groups, scores }: { groups: Group[]; scores: number[] }) {
  return (
    <>
      {groups.map((g, i) => (
        <span
          key={g.id}
          className="rounded-full border-2 bg-white/5 px-3 py-1 text-[11px] font-bold"
          style={{ borderColor: g.color }}
        >
          {g.name} · {scores[i]}
        </span>
      ))}
    </>
  );
}

export function LeaderPill({ name, score }: { name: string; score: number }) {
  return (
    <span className="rounded-full border-2 border-sun bg-white/5 px-3 py-1 text-[11px] font-bold">
      الأول: {name} · {score}
    </span>
  );
}

/* ---------- arena (lobby) ---------- */

export function ArenaBoard({
  code,
  url,
  mode,
  count,
  groups,
  sizes,
  names,
}: {
  code: string;
  /** where the QR code and the written address lead: the real join page */
  url?: string;
  mode: "groups" | "individual";
  count: number;
  groups: Group[];
  sizes: number[];
  names: string[];
}) {
  const link = url ?? `https://qafza.ai/${code}`;
  const host = link.replace(/^https?:\/\//, "").split("/")[0];
  return (
    <section
      aria-label="السبورة"
      className="dots relative overflow-hidden rounded-[28px] bg-gradient-to-b from-[#271456] to-[#481d91] p-6 text-white shadow-2xl shadow-indigo-deep/30 sm:p-8"
    >
      <div className="relative z-10 grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <p className="text-xs font-semibold text-white/80">
            ادخلوا من <span dir="ltr">{host}</span> بالرمز
          </p>
          <p dir="ltr" className="my-2 text-end text-[88px] font-bold leading-none tracking-wide sm:text-[104px]">
            {code}
          </p>
          <p className="text-sm font-bold">{count} طالبًا في الساحة</p>

          {mode === "groups" ? (
            <div className={`mt-4 grid gap-3 ${groups.length === 4 ? "sm:grid-cols-4" : groups.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
              {groups.map((g, i) => (
                <div key={g.id} className="rounded-2xl bg-white/10 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="mt-1 size-2.5 shrink-0 rounded-[3px]" style={{ background: g.color }} />
                    <p className="flex-1 text-sm font-bold leading-6">مجموعة {g.name}</p>
                  </div>
                  <p className="mt-1 text-[10px] font-medium text-white/65">
                    {sizes[i]} طلاب · إتقان {g.mastery}%
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {names.map((n, i) => (
                <span key={`${n}-${i}`} className="animate-[pop_.35s_ease-out] rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold">
                  {n}
                </span>
              ))}
              {count > names.length && (
                <span className="rounded-full bg-white/25 px-3 py-1.5 text-[11px] font-bold">
                  +{count - names.length}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mx-auto rounded-3xl bg-white p-3.5">
          <QRCodeSVG value={link} size={148} level="M" fgColor="#1b0f3d" title={`رمز QR للدرس ${code}`} />
        </div>
      </div>
    </section>
  );
}

export function BoardOnlyArena({ lesson, groups, sizes }: { lesson: Lesson; groups: Group[]; sizes: number[] }) {
  return (
    <BoardFrame
      label="السبورة: ما يراه الصف"
      right={<ScorePills groups={groups} scores={groups.map(() => 0)} />}
      center
    >
      <div className="w-full text-start">
        <span className="inline-block rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold">حصة على السبورة · بلا أجهزة</span>
        <h2 className="mt-4 text-[56px] font-bold leading-tight sm:text-[64px]">{lesson.title}</h2>
        <p className="mt-2 text-lg font-semibold text-white/85">اجلسوا مع مجموعاتكم، وجهّزوا بطاقات الإجابة.</p>
        <div className={`mt-7 grid gap-3.5 ${groups.length === 4 ? "sm:grid-cols-4" : groups.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          {groups.map((g, i) => (
            <div key={g.id} className="relative rounded-2xl border-2 bg-white/[0.07] px-5 py-5" style={{ borderColor: g.color }}>
              <span className="absolute end-4 top-4 size-3 rounded-[3px]" style={{ background: g.color }} />
              <p className="whitespace-nowrap text-[22px] font-bold">مجموعة {g.name}</p>
              <p className="mt-1 text-sm font-semibold text-white/70">{sizes[i]} طلاب</p>
            </div>
          ))}
        </div>
      </div>
    </BoardFrame>
  );
}

/* ---------- explain ---------- */

export function ExplainBoard({
  station,
  index,
  total,
  right,
}: {
  station: Station;
  index: number;
  total: number;
  right: React.ReactNode;
}) {
  const [lead, ...rest] = station.content.split("\n");
  const bullets = rest.map((l) => l.replace(/^▪\s*/, ""));
  return (
    <BoardFrame label={`الشرح · المحطة ${index + 1} من ${total}`} right={right}>
      <h2 className="text-[44px] font-bold leading-tight sm:text-5xl">{station.title}</h2>
      <p className="mt-2 max-w-2xl text-base font-medium text-white/80">{lead}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {bullets.map((b, i) => {
          const [head, ...tail] = b.split(/[:：]/);
          return (
            <div key={i} className="rounded-2xl bg-white/10 px-5 py-4">
              {tail.length ? (
                <>
                  <p className="text-xs font-bold text-sun">{head}</p>
                  <p className="mt-1 text-[15px] font-semibold leading-7">{tail.join(":").trim()}</p>
                </>
              ) : (
                <p className="text-[15px] font-semibold leading-7">{b}</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-6 rounded-2xl bg-sun px-5 py-4 text-base font-bold text-indigo-deep">
        الفكرة الأهم: {station.keyIdea}
      </p>
    </BoardFrame>
  );
}

/* ---------- challenge / reveal ---------- */

function Tile({
  letter,
  color,
  text,
  state,
}: {
  letter: string;
  color: string;
  text: string;
  state: "idle" | "right" | "dim";
}) {
  return (
    <div
      className={`flex items-center gap-3.5 rounded-2xl border-2 px-4 py-4 transition ${
        state === "right"
          ? "border-mint bg-mint/20"
          : state === "dim"
            ? "border-white/10 bg-white/5 opacity-45"
            : "border-white/10 bg-white/10"
      }`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white" style={{ background: color }}>
        {state === "right" ? <Check className="size-5" strokeWidth={3} /> : letter}
      </span>
      <span className="text-lg font-bold leading-snug">{text}</span>
    </div>
  );
}

export function ChallengeBoard({
  challenge,
  label,
  reveal,
  right,
}: {
  challenge: Challenge;
  label: string;
  reveal: boolean;
  right: React.ReactNode;
}) {
  return (
    <BoardFrame label={label} right={right}>
      {challenge.kind === "mcq" && (
        <>
          <h2 className="text-3xl font-bold leading-snug sm:text-[34px]">{challenge.question}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {challenge.options.map((o, i) => (
              <Tile
                key={i}
                letter={AR_LETTERS[i]}
                color={ANSWER_CARDS[i].color}
                text={o.text}
                state={!reveal ? "idle" : i === challenge.correct ? "right" : "dim"}
              />
            ))}
          </div>
        </>
      )}

      {challenge.kind === "tf" && (
        <>
          <h2 className="text-3xl font-bold leading-snug sm:text-[34px]">{challenge.statement}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Tile letter="صح" color={ANSWER_CARDS[4].color} text="صحيحة" state={!reveal ? "idle" : challenge.answer ? "right" : "dim"} />
            <Tile letter="خطأ" color={ANSWER_CARDS[5].color} text="خاطئة" state={!reveal ? "idle" : !challenge.answer ? "right" : "dim"} />
          </div>
          {reveal && !challenge.answer && <p className="mt-4 text-base font-semibold text-white/80">{challenge.explanation}</p>}
          {reveal && challenge.answer && challenge.explanation && (
            <p className="mt-4 text-base font-semibold text-white/80">{challenge.explanation}</p>
          )}
        </>
      )}

      {challenge.kind === "dnd" && (
        <>
          <h2 className="text-3xl font-bold leading-snug sm:text-[34px]">{challenge.prompt}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {challenge.slots.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-bold text-sun">{s.label}</p>
                <div
                  className={`mt-2 grid min-h-14 place-items-center rounded-xl border-2 border-dashed px-3 py-3 text-sm font-bold ${
                    reveal ? "border-mint bg-mint/20" : "border-white/25 text-white/40"
                  }`}
                >
                  {reveal ? s.card : "أفلِت هنا"}
                </div>
              </div>
            ))}
          </div>
          {!reveal && (
            <div className="mt-4 flex flex-wrap gap-2">
              {[...challenge.slots].reverse().map((s) => (
                <span key={s.card} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-indigo-deep">
                  {s.card}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {challenge.kind === "match" && (
        <>
          <h2 className="text-3xl font-bold leading-snug sm:text-[34px]">{challenge.prompt}</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3">
            <div className="space-y-3">
              {challenge.pairs.map((p) => (
                <div key={p.term} className="rounded-2xl bg-white/10 px-5 py-3.5 text-lg font-bold">
                  {p.term}
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {(reveal ? challenge.pairs : [...challenge.pairs].reverse()).map((p) => (
                <div
                  key={p.meaning}
                  className={`rounded-2xl border-2 px-5 py-3.5 text-base font-semibold ${
                    reveal ? "border-mint bg-mint/20" : "border-white/10 bg-white/5"
                  }`}
                >
                  {p.meaning}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </BoardFrame>
  );
}

export function BossBoard({
  items,
  reveal,
  right,
}: {
  items: Lesson["boss"];
  reveal: boolean;
  right: React.ReactNode;
}) {
  return (
    <BoardFrame label="تحدّي الزعيم · بالموت المفاجئ" right={right}>
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-pink-card">
          <Lock className="size-5" />
        </span>
        <h2 className="text-3xl font-bold">تحدّي الزعيم</h2>
      </div>
      <p className="mt-2 text-sm font-medium text-white/75">أربع عبارات: خطأ واحد ينهي الجولة.</p>
      <ul className="mt-5 space-y-3">
        {items.map((b, i) => (
          <li key={i} className="flex items-center justify-between gap-4 rounded-2xl bg-white/10 px-5 py-4">
            <span className="text-lg font-bold">{b.statement}</span>
            <span
              className={`w-20 shrink-0 rounded-full py-1.5 text-center text-xs font-bold ${
                !reveal ? "bg-white/10 text-white/40" : b.answer ? "bg-mint text-white" : "bg-[#e11d48] text-white"
              }`}
            >
              {reveal ? (b.answer ? "صحيحة" : "خاطئة") : "؟"}
            </span>
          </li>
        ))}
      </ul>
    </BoardFrame>
  );
}

/* ---------- finish ---------- */

export function FinishBoard({
  rows,
  mode,
}: {
  rows: { name: string; score: number; color: string }[];
  mode: "groups" | "individual";
}) {
  const max = Math.max(1, ...rows.map((r) => r.score));
  return (
    <BoardFrame label={mode === "groups" ? "الترتيب النهائي للمجموعات" : "الخمسة الأوائل"}>
      <h2 className="text-[44px] font-bold leading-tight">انتهت الحصة</h2>
      <p className="mt-1 text-base font-semibold text-white/80">
        {rows[0] ? (mode === "groups" ? `فازت مجموعة ${rows[0].name}.` : `الأول: ${rows[0].name}.`) : ""}
      </p>
      <ol className="mt-6 space-y-3">
        {rows.map((r, i) => (
          <li key={r.name} className="rounded-2xl bg-white/10 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-3 text-lg font-bold">
                <span className="grid size-8 place-items-center rounded-full text-sm" style={{ background: r.color }}>
                  {i + 1}
                </span>
                {mode === "groups" ? `مجموعة ${r.name}` : r.name}
              </span>
              <span className="text-xl font-bold">{r.score}</span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${(r.score / max) * 100}%`, background: r.color }} />
            </div>
          </li>
        ))}
      </ol>
    </BoardFrame>
  );
}
