"use client";

import { useEffect, useState } from "react";
import { Check, Flame as FlameIcon, Layers, Network, Zap, type LucideIcon } from "lucide-react";
import { api } from "@/lib/client-api";
import { ago } from "@/lib/ago";
import { BADGES, CARDS, RANKS, nextRank, rankIndex, rankOf } from "@/lib/play";
import { useFlow } from "@/components/teacher/FlowProvider";
import { Switch } from "@/components/teacher/ui";
import { BadgeShape } from "../BadgeShape";
import { LearnHeader, PlayerAvatar } from "../StudentHeader";
import { useStudent } from "../StudentProvider";

/** the two switches live on this device: they change what this browser shows and sends */
function useDeviceFlag(key: string, fallback: boolean): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(fallback);
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const x = localStorage.getItem(key);
        if (x !== null) setV(x === "1");
      } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, [key]);
  return [
    v,
    (n) => {
      setV(n);
      try {
        localStorage.setItem(key, n ? "1" : "0");
      } catch {}
    },
  ];
}

function Stat({ icon: Icon, tone, value, label }: { icon: LucideIcon; tone: string; value: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl border border-violet/10 bg-white px-5 py-4 shadow-sm">
      <div>
        <p className="text-[26px] font-bold leading-tight text-indigo-deep">{value}</p>
        <p className="text-[11px] font-semibold text-indigo-deep/55">{label}</p>
      </div>
      <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
        <Icon className="size-[18px]" />
      </span>
    </div>
  );
}

const accTone = (a: number) => (a >= 80 ? "text-emerald-600" : a >= 70 ? "text-indigo-deep" : "text-amber-600");

export function ProfileView() {
  const { account } = useFlow();
  const { name, progress } = useStudent();
  const points = progress?.points ?? 0;
  const streak = progress?.streak ?? 0;
  const badges = progress?.badges ?? [];
  const [showName, setShowName] = useDeviceFlag("qafza:showName", true);
  const [remind, setRemind] = useDeviceFlag("qafza:remind", true);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function removeAccount() {
    setBusy(true);
    setDeleteError(null);
    const r = await api("/api/auth/me", { method: "DELETE" });
    setBusy(false);
    if (!r.ok) return setDeleteError(r.error);
    // a full load: it also clears the in-memory state of the deleted account
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  }

  const rank = rankOf(points);
  const next = nextRank(points);
  const idx = rankIndex(points);
  const toNext = next ? Math.min(100, Math.round(((points - rank.from) / (next.from - rank.from)) * 100)) : 100;
  const cards = new Set<number>(Object.values(progress?.cards ?? {}).flat());
  const lessonsDone = progress?.lessonsDone ?? 0;
  const since = progress ? new Date(progress.since).toLocaleDateString("ar", { month: "long", year: "numeric" }) : "";

  return (
    <>
      <LearnHeader />
      <main className="mx-auto w-full max-w-[860px] flex-1 px-5 py-6">
        <section className="dots relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#241356] to-[#5b21b6] p-6 text-white shadow-xl shadow-indigo-deep/25">
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-center gap-4">
              <span className="rounded-[34%] bg-pink-500/30 p-2 ring-2 ring-white/20">
                <PlayerAvatar size={66} />
              </span>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-[34px] font-bold leading-none">{name}</h1>
                  <span className="rounded-full bg-sun px-3 py-1 text-xs font-bold text-indigo-deep">{rank.name}</span>
                </div>
                <p className="mt-2 text-xs font-medium text-white/80">{progress ? `عضو منذ ${since}` : account ? "" : "ضيف: لا يُحفظ تقدّمك"}</p>
              </div>
            </div>
            <div className="w-full max-w-[260px]">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span>{next ? `إلى «${next.name}»` : "أعلى رتبة"}</span>
                <span>{next ? `${points} من ${next.from}` : points}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={toNext} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-gradient-to-l from-pink-400 to-sun transition-[width] duration-700" style={{ width: `${toNext}%` }} />
              </div>
            </div>
          </div>

          <ol className="relative mt-6 flex items-start justify-between">
            <span aria-hidden className="absolute inset-x-8 top-[18px] h-0.5 bg-white/20" />
            {RANKS.map((r, i) => {
              const done = i < idx;
              const here = i === idx;
              return (
                <li key={r.name} className="relative z-10 flex flex-1 flex-col items-center" aria-current={here ? "step" : undefined}>
                  <span
                    className={`grid size-9 place-items-center rounded-full text-sm font-bold ${
                      here ? "bg-sun text-indigo-deep ring-4 ring-sun/30" : done ? "bg-white text-violet" : "bg-white/15 text-white/70"
                    }`}
                  >
                    {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="mt-2 text-xs font-bold">{r.name}</span>
                  <span className="text-[10px] font-medium text-white/60">{r.from} نقطة</span>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <Stat icon={Zap} tone="bg-mint/15 text-emerald-600" value={String(points)} label="نقطة معرفة" />
          <Stat icon={FlameIcon} tone="bg-orange-100 text-orange-500" value={`${streak} أيام`} label="الشعلة" />
          <Stat icon={Network} tone="bg-violet/10 text-violet" value={String(lessonsDone)} label="دروس مكتملة" />
          <Stat icon={Layers} tone="bg-teal-100 text-teal-600" value={progress?.accuracy == null ? "—" : `${progress.accuracy}%`} label="متوسط الدقّة" />
        </div>

        <div className="mt-3 grid items-start gap-3 md:grid-cols-[1.5fr_1fr]">
          <section className="rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold text-indigo-deep">الشارات</h2>
              <span className="text-[11px] font-semibold text-indigo-deep/50">
                {badges.length} من {BADGES.length}
              </span>
            </div>
            <ul className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
              {BADGES.map((b) => {
                const earned = badges.includes(b.id);
                return (
                  <li key={b.id} className={`rounded-2xl border p-2.5 text-center ${earned ? "border-violet/10 bg-white" : "border-transparent bg-violet/[0.05]"}`}>
                    <span className="mx-auto block w-fit">
                      <BadgeShape color={b.color} locked={!earned} size={42} />
                    </span>
                    <p className={`mt-2 text-[11px] font-bold leading-4 ${earned ? "text-indigo-deep" : "text-indigo-deep/40"}`}>{b.name}</p>
                    <p className={`mt-0.5 text-[9px] font-medium leading-[13px] ${earned ? "text-indigo-deep/60" : "text-indigo-deep/35"}`}>{b.how}</p>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold text-indigo-deep">بطاقاتي</h2>
              <span className="text-[11px] font-semibold text-indigo-deep/50">
                {cards.size} من {CARDS.length}
              </span>
            </div>
            <ul className="mt-4 grid grid-cols-3 gap-2">
              {CARDS.map((c, i) => {
                const has = cards.has(i);
                return (
                  <li
                    key={c.name}
                    className={`grid aspect-[4/5] place-items-center rounded-xl p-1.5 text-center text-[10px] font-bold leading-4 ${
                      has ? (c.rare ? "bg-gradient-to-br from-violet to-orchid text-white" : "bg-gradient-to-br from-violet to-orchid text-white") : "border border-dashed border-violet/25 bg-violet/[0.04] text-indigo-deep/30"
                    }`}
                  >
                    {has ? (
                      <span>
                        {c.rare ? "★" : <Check className="mx-auto size-4" strokeWidth={3} />}
                        <span className="mt-1 block">{c.name}</span>
                        {c.rare && <span className="mt-1 block rounded-full bg-sun px-2 py-0.5 text-[8px] text-indigo-deep">نادرة</span>}
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
            <p className="mt-3 text-[11px] font-medium leading-5 text-indigo-deep/55">كل بطاقة من محتوى درس لعبته، فتراجع وأنت تجمع.</p>
          </section>
        </div>

        <section className="mt-3 rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-indigo-deep">الدروس</h2>
          {progress && progress.history.length ? (
            <div role="table" className="mt-3">
              <div role="row" className="grid grid-cols-[1.6fr_1fr_1fr_.6fr] gap-3 border-b border-violet/10 pb-2.5 text-[11px] font-semibold text-indigo-deep/45">
                {["الدرس", "النوع", "متى", "الدقّة"].map((h) => (
                  <span key={h} role="columnheader">{h}</span>
                ))}
              </div>
              {progress.history.map((l) => (
                <div key={`${l.lessonId}-${l.at}`} role="row" className="grid grid-cols-[1.6fr_1fr_1fr_.6fr] items-center gap-3 border-b border-violet/[0.07] py-3.5 text-xs last:border-0">
                  <span className="truncate font-bold text-indigo-deep">{l.title}</span>
                  <span className="font-medium text-indigo-deep/50">{l.mode === "live" ? "حصة مباشرة" : "تعلّم ذاتي"}</span>
                  <span className="font-medium text-indigo-deep/70">{ago(l.at)}</span>
                  <span className={`font-bold ${accTone(l.accuracy)}`}>{l.accuracy}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl bg-violet/[0.05] px-4 py-5 text-center text-xs font-bold text-indigo-deep/60">لم تُنهِ أي درس بعد. ستظهر دروسك ودقّتك هنا.</p>
          )}
        </section>

        <section className="mt-3 rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-indigo-deep">الخصوصية وولي الأمر</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center gap-3.5">
                <Switch label="أظهر اسمي في لوحات الصدارة" checked={showName} onChange={setShowName} />
                <span>
                  <span className="block text-sm font-bold text-indigo-deep">أظهر اسمي في لوحات الصدارة</span>
                  <span className="mt-0.5 block text-[11px] font-medium text-indigo-deep/55">
                    {showName ? "وإلا تظهر باسم مجموعتك أو «لاعب»." : "تظهر الآن باسم مجموعتك أو «لاعب»."}
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-3.5">
                <Switch label="ذكّرني بالتثبيت اليومي" checked={remind} onChange={setRemind} />
                <span>
                  <span className="block text-sm font-bold text-indigo-deep">ذكّرني بالتثبيت اليومي</span>
                  <span className="mt-0.5 block text-[11px] font-medium text-indigo-deep/55">إشعار واحد في اليوم حين تحين مراجعة.</span>
                </span>
              </label>
            </div>
            <div className="rounded-2xl bg-violet/[0.05] p-4">
              <h3 className="text-sm font-bold text-indigo-deep">بياناتك</h3>
              <p className="mt-1.5 text-[11px] font-medium leading-6 text-indigo-deep/65">
                الخياران يُحفظان على هذا الجهاز. إن كان عمرك أقل من 13 سنة فحسابك مرتبط بولي أمرك، يرى تقدّمك ويستطيع حذف الحساب.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-violet/10 pt-3.5">
            <button disabled={!account} onClick={() => setDeleting(true)} className="text-[11px] font-bold text-[#c0174f] underline underline-offset-4">
              احذف حسابي وبياناتي
            </button>
            <a href="/api/auth/export" className="text-[11px] font-bold text-violet underline underline-offset-4">
              نزّل نسخة من بياناتي
            </a>
          </div>
        </section>
      </main>

      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-indigo-deep/40 p-5 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setDeleting(false)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="del-st" className="w-full max-w-[400px] animate-[pop_.25s_ease-out] rounded-3xl bg-white p-6 shadow-2xl">
            <h2 id="del-st" className="text-xl font-bold text-indigo-deep">حذف حسابك وبياناتك؟</h2>
            <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/65">تُحذف نقاطك وشاراتك وبطاقاتك نهائيًا. للتأكيد اكتب «احذف».</p>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              aria-label="اكتب احذف للتأكيد"
              className="mt-4 w-full rounded-2xl border border-violet/15 px-4 py-3 text-sm outline-none focus:border-violet focus:ring-4 focus:ring-violet/10"
            />
            {deleteError && <p role="alert" className="mt-2 text-xs font-bold text-[#c0174f]">{deleteError}</p>}
            <div className="mt-4 flex gap-2.5">
              <button disabled={confirmText.trim() !== "احذف" || busy} onClick={removeAccount} className="flex-1 rounded-full bg-[#c0174f] py-3 text-xs font-bold text-white disabled:opacity-40">
                {busy ? "جارٍ الحذف…" : "احذف نهائيًا"}
              </button>
              <button onClick={() => { setDeleting(false); setConfirmText(""); }} className="rounded-full border border-violet/15 px-6 py-3 text-xs font-bold text-violet">
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
