"use client";

import Link from "next/link";
import { Check, Clock, Layers, Trophy, Zap } from "lucide-react";
import { CARDS, GROUP_BASE, PEERS, PLAYER, badgeOf, rankOf, type BadgeId } from "@/lib/play";
import { useFlow } from "@/components/teacher/FlowProvider";
import { useToast } from "@/components/teacher/Toast";
import { BadgeShape } from "../BadgeShape";
import { NamePill, PlayHeader } from "../StudentHeader";
import { useStudent, type LessonResult } from "../StudentProvider";

/** shown when the page is opened directly, so the screen is never empty (the numbers in the design) */
const SAMPLE: Omit<LessonResult, "lesson"> = {
  points: 150,
  right: 4,
  total: 5,
  accuracy: 83,
  minutes: 14,
  modes: 4,
  badges: ["blazing", "boss", "support"],
  cards: [0, 2, 5],
  bestStreak: 5,
  hearts: 3,
  bossBeaten: true,
  missed: [0],
  startPoints: 0,
};

function Ring({ pct }: { pct: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-[120px] shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" role="img" aria-label={`الدقة ${pct}%`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f5b82e" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} />
      </svg>
      <div className="text-center">
        <p className="text-[28px] font-bold leading-none">{pct}%</p>
        <p className="mt-1 text-[10px] font-semibold text-white/70">دقّة</p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, tone, value, label }: { icon: typeof Zap; tone: string; value: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl border border-violet/10 bg-white px-5 py-4 shadow-sm">
      <div>
        <p className="text-[26px] font-bold leading-tight text-indigo-deep">{value}</p>
        <p className="text-[11px] font-semibold text-indigo-deep/55">{label}</p>
      </div>
      <span className={`grid size-11 place-items-center rounded-2xl text-white ${tone}`}>
        <Icon className="size-5" />
      </span>
    </div>
  );
}

export function ResultView() {
  const { sample, account } = useFlow();
  const { result } = useStudent();
  const toast = useToast();
  const r = result ?? { ...SAMPLE, lesson: sample };
  const lesson = r.lesson;

  const points = r.startPoints + r.points;
  const rank = rankOf(points);
  const people = [
    ...PEERS.map((p) => ({ name: p.name, initial: p.initial, color: p.color, score: p.base, me: false })),
    { name: `${PLAYER.name} (أنت)`, initial: PLAYER.initial, color: PLAYER.color, score: r.points, me: true },
  ].sort((a, b) => b.score - a.score);
  const first = people[0].me;
  const groups = GROUP_BASE.map((g) => ({ ...g, score: g.base + (g.mine ? r.points : 0) })).sort((a, b) => b.score - a.score);
  const maxGroup = Math.max(...groups.map((g) => g.score));
  const myGroupFirst = groups[0].mine;

  const shown: BadgeId[] = [...new Set<BadgeId>([...r.badges, "flawless"])].slice(0, 4);
  const sub = `${first ? "الأول بين اللاعبين" : `رتبتك ${people.findIndex((p) => p.me) + 1} بين اللاعبين`}، ${myGroupFirst ? "ومجموعتك الصقور في الصدارة" : "ومجموعتك الصقور تلاحق الصدارة"}.`;

  async function share() {
    const text = `أنهيت درس «${lesson.title}» في قفزة بدقّة ${r.accuracy}%، وجمعت ${r.points} نقطة معرفة!`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast.show("نُسخ إنجازك، الصقه حيث تشاء");
      }
    } catch {
      /* user dismissed the share sheet */
    }
  }

  return (
    <>
      <PlayHeader>
        <NamePill group={{ name: "الصقور", color: "#ec4899" }} />
      </PlayHeader>
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 py-6">
        <section className="dots relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#241356] to-[#5b21b6] p-7 text-white shadow-2xl shadow-indigo-deep/25 sm:p-9">
          <span className="absolute start-[10%] top-[18%] size-3 rotate-45 bg-sun/90" />
          <span className="absolute bottom-[14%] start-[22%] size-2.5 rounded-full bg-teal-300" />
          <span className="absolute end-[40%] top-[10%] size-2.5 rounded-full bg-pink-400" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <span className="hidden size-24 place-items-center rounded-3xl bg-brand shadow-xl sm:grid">
                <Trophy className="size-10" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white/75">{lesson.title}</p>
              <h1 className="mt-1 text-[38px] font-bold leading-tight sm:text-[46px]">{r.bossBeaten ? "أنهيت الدرس، وهزمت الزعيم!" : "أنهيت الدرس!"}</h1>
              <p className="mt-1.5 text-sm font-semibold text-white/85">{sub}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-sun px-4 py-1.5 text-xs font-bold text-indigo-deep">الرتبة: {rank.name}</span>
                <span className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold">أفضل شعلة: {r.bestStreak}</span>
                <span className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold">{r.hearts} قلوب بقيت</span>
              </div>
            </div>
            <Ring pct={r.accuracy} />
          </div>
        </section>

        {account && result ? (
          <section className="mt-4 flex items-center gap-4 rounded-3xl border-2 border-mint/40 bg-mint/10 p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-mint text-white">
              <Check className="size-6" strokeWidth={3} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-emerald-900">حُفظت إنجازاتك في حسابك</h2>
              <p className="mt-0.5 text-xs font-medium text-emerald-900/75">
                {r.points} نقطة معرفة، و{r.badges.length} شارات، و{r.cards.length} بطاقات. تجدها في «سجلّي»، وما أخطأت فيه يعود إليك في التثبيت.
              </p>
            </div>
          </section>
        ) : (
          <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-violet/30 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand text-white">
                <Trophy className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-indigo-deep">احفظ إنجازاتك قبل أن تغادر</h2>
                <p className="mt-0.5 text-xs font-medium text-indigo-deep/70">
                  {r.points} نقطة معرفة، و{r.badges.length} شارات، و{r.cards.length} بطاقات، ورتبة {rank.name}. حساب مجاني في ثوانٍ.{" "}
                  <Link href="/parent-consent" className="font-bold text-violet underline underline-offset-2">
                    عمري أقل من 13
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/signup" className="rounded-2xl bg-brand px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-violet/25">
                أنشئ حسابًا بالبريد
              </Link>
              <Link href="/login" className="rounded-2xl border border-violet/15 bg-white px-5 py-2.5 text-xs font-bold text-indigo-deep transition hover:border-violet/40">
                لدي حساب
              </Link>
            </div>
          </section>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Zap} tone="bg-mint" value={String(r.points)} label="نقطة معرفة في هذا الدرس" />
          <StatCard icon={Layers} tone="bg-violet" value={`${r.right} من ${lesson.stations.length}`} label="تحديات صحيحة" />
          <StatCard icon={Layers} tone="bg-pink-card" value={String(r.modes)} label="أنماط عرض مررت بها" />
          <StatCard icon={Clock} tone="bg-amber-500" value={`${r.minutes} د`} label="وقت اللعب" />
        </div>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.25fr_1fr_1fr]">
          <section className="rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-indigo-deep">الشارات</h2>
            <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {shown.map((id) => {
                const b = badgeOf(id);
                const earned = r.badges.includes(id);
                return (
                  <li key={id} className={`rounded-2xl border p-3 text-center ${earned ? "border-violet/10 bg-white" : "border-transparent bg-violet/[0.05]"}`}>
                    <span className="mx-auto block w-fit">
                      <BadgeShape color={b.color} locked={!earned} />
                    </span>
                    <p className={`mt-2 text-xs font-bold leading-5 ${earned ? "text-indigo-deep" : "text-indigo-deep/40"}`}>{b.name}</p>
                    <p className={`mt-0.5 text-[10px] font-medium leading-4 ${earned ? "text-indigo-deep/60" : "text-indigo-deep/35"}`}>{earned ? b.earned : b.how}</p>
                  </li>
                );
              })}
            </ul>

            <h2 className="mt-6 text-lg font-bold text-indigo-deep">بطاقاتك: {r.cards.length} من {CARDS.length}</h2>
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {CARDS.map((c, i) => {
                const has = r.cards.includes(i);
                return (
                  <li
                    key={c.name}
                    className={`grid aspect-[3/4] place-items-center rounded-xl p-1.5 text-center text-[10px] font-bold leading-4 ${
                      has ? (c.rare ? "bg-gradient-to-br from-amber-400 to-pink-500 text-white" : "bg-gradient-to-br from-violet to-orchid text-white") : "border border-dashed border-violet/25 bg-violet/[0.04] text-indigo-deep/30"
                    }`}
                  >
                    {has ? (
                      <span>
                        {c.rare ? "★" : <Check className="mx-auto size-4" strokeWidth={3} />}
                        <span className="mt-1 block">{c.name}</span>
                        {c.rare && <span className="block text-[8px] opacity-90">نادرة</span>}
                      </span>
                    ) : (
                      <span>
                        ؟<span className="mt-1 block font-medium">لم تُكتشف</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-indigo-deep">عالمك: مكتبة المعرفة</h2>
            <div className="dots relative mt-3 flex h-32 items-end justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-[#241356] to-[#5b21b6] px-4 pb-0">
              <span className="absolute start-3 top-3 rounded-full bg-sun px-3 py-1 text-[10px] font-bold text-indigo-deep">+1 كتاب</span>
              {[
                ["#8b5cf6", 70],
                ["#f59e0b", 52],
                ["#10b981", 78],
                ["#ec4899", 58],
                ["#7b26cc", 66],
              ].map(([c, h], i) => (
                <span key={i} className="relative z-10 w-5 rounded-t-md" style={{ background: c as string, height: `${h}%` }} />
              ))}
            </div>
            <p className="mt-3 text-xs font-medium leading-6 text-indigo-deep/70">كل درس تُنهيه يضيف كتابًا إلى رفّك. 5 كتب، والرف القادم يُفتح بعد 3 دروس.</p>
            {r.missed.length > 0 ? (
              <p className="mt-3 rounded-2xl bg-violet/10 px-4 py-3 text-[11px] font-semibold leading-6 text-violet">
                تثبيت الغد جاهز: أخطأت في «{lesson.stations[r.missed[0]].challenge.kind === "mcq" ? (lesson.stations[r.missed[0]].challenge as { question: string }).question : lesson.stations[r.missed[0]].title}»، فتعود إليك غدًا في دقيقتين.
              </p>
            ) : (
              <p className="mt-3 rounded-2xl bg-mint/10 px-4 py-3 text-[11px] font-semibold leading-6 text-emerald-800">لم تُخطئ في شيء، فلا تثبيت عليك غدًا. أحسنت!</p>
            )}
          </section>

          <section className="rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-indigo-deep">لوحة الصدارة النهائية</h2>
            <ol className="mt-3 space-y-2">
              {people.map((p, i) => (
                <li key={p.name} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold ${p.me ? "border-2 border-violet bg-violet/[0.06]" : "bg-violet/[0.03]"}`}>
                  <span className="w-3 text-[10px] text-indigo-deep/50">{i + 1}</span>
                  <span className="grid size-6 place-items-center rounded-full text-[10px] text-white" style={{ background: p.color }}>
                    {p.initial}
                  </span>
                  <span className="flex-1 truncate text-indigo-deep">{p.name}</span>
                  <span className="text-indigo-deep">{p.score}</span>
                </li>
              ))}
            </ol>
            <h2 className="mt-5 text-lg font-bold text-indigo-deep">المجموعات</h2>
            <ul className="mt-3 space-y-3">
              {groups.map((g) => (
                <li key={g.name}>
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-deep">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-[3px]" style={{ background: g.color }} />
                      {g.name}{g.mine ? "، مجموعتك" : ""}
                    </span>
                    <span>{g.score}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${(g.score / maxGroup) * 100}%`, background: g.color }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button onClick={share} className="rounded-full border border-violet/15 bg-white px-7 py-3.5 text-sm font-bold text-indigo-deep shadow-sm transition hover:border-violet/40">
            شارك إنجازك
          </button>
          <Link href="/play/self" className="rounded-full bg-brand px-10 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110">
            العب مرة أخرى
          </Link>
        </div>
      </main>
      {toast.node}
    </>
  );
}
