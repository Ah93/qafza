"use client";

import * as plural from "@/lib/plural";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/teacher/Toast";
import { useLessonByCode } from "@/components/useLessonByCode";
import { api } from "@/lib/client-api";
import { CHALLENGE_LABELS, type Lesson } from "@/lib/lesson";
import { GROUP_POOL } from "@/lib/live";
import { buildSlides, ENGAGE_CAP_PER_STATION, POINTS_ENGAGE, POINTS_RIGHT, type LiveAnswer, type StudentSnap } from "@/lib/live-flow";
import { rankOf } from "@/lib/play";
import { setSoundContext, sfx } from "@/lib/sound";
import { Overlay } from "../Overlay";
import { NamePill, PlayHeader } from "../StudentHeader";
import type { LiveSeat } from "../StudentProvider";
import { LiveChallenge, LiveReveal } from "./LiveChallenge";
import { StationView } from "./StationView";

const post = (code: string, body: Record<string, unknown>) =>
  api<{ ok?: boolean; engaged?: number }>(`/api/live/${code}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

type Conn = "connecting" | "live" | "lost" | "gone";

/** the live lesson as a student sees it: the screen follows the teacher, answers go to the server */
export function LiveStudentReal({ seat }: { seat: LiveSeat }) {
  const { lesson, missing } = useLessonByCode(seat.code);
  const toast = useToast();
  const router = useRouter();
  const [snap, setSnap] = useState<StudentSnap | null>(null);
  const [link, setLink] = useState<Conn>("connecting");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [tries, setTries] = useState(0);
  const lastKey = useRef("");
  const queued = useRef<{ slide: number; answer: LiveAnswer } | null>(null);

  // in a live class sound starts muted (until the student switches it on)
  useEffect(() => {
    setSoundContext(true);
    return () => setSoundContext(false);
  }, []);

  // one stream; the browser reconnects by itself, a 403/404 closes it for good
  useEffect(() => {
    const es = new EventSource(`/api/live/${seat.code}/events?role=student&sid=${encodeURIComponent(seat.sid)}`);
    es.onmessage = (e) => {
      try {
        setSnap(JSON.parse(e.data) as StudentSnap);
        setLink("live");
      } catch {}
    };
    es.onerror = () => {
      // readyState CLOSED means the server refused (session over or seat unknown)
      setLink(es.readyState === EventSource.CLOSED ? "gone" : "lost");
    };
    return () => es.close();
  }, [seat.code, seat.sid, tries]);

  const slides = useMemo(() => (lesson ? buildSlides(lesson.stations.length) : []), [lesson]);
  const slide = snap ? slides[snap.at] : undefined;

  // a new slide is a new moment: scroll up so the student does not start halfway down
  const key = snap ? `${snap.at}` : "";
  useEffect(() => {
    if (key && key !== lastKey.current) {
      lastKey.current = key;
      window.scrollTo({ top: 0 });
    }
  }, [key]);

  // an answer given while offline goes out as soon as the connection is back
  useEffect(() => {
    const q = queued.current;
    if (link !== "live" || !q || !snap) return;
    queued.current = null;
    const ci = slides[q.slide] && "i" in slides[q.slide] ? (slides[q.slide] as { i: number }).i : -1;
    if (snap.at === q.slide && !snap.me.answered.includes(ci)) void post(seat.code, { action: "answer", sid: seat.sid, slide: q.slide, answer: q.answer });
  }, [link, snap, slides, seat]);

  // the teacher's reveal comes with a sound: bright for a right answer, soft for a wrong one
  const reveal = snap ? slides[snap.at] : undefined;
  const revealAt = reveal?.kind === "reveal" ? reveal.i : null;
  const revealOutcome = snap && revealAt !== null ? snap.me.outcomes[revealAt] : undefined;
  const played = useRef<number | null>(null);
  useEffect(() => {
    if (revealAt === null || played.current === revealAt) return;
    played.current = revealAt;
    if (!revealOutcome) sfx.reveal();
    else if (revealOutcome.right === revealOutcome.of) sfx.right();
    else if (revealOutcome.right > 0) sfx.reveal();
    else sfx.wrong();
  }, [revealAt, revealOutcome]);

  const send = useCallback(
    async (answer: LiveAnswer) => {
      if (!snap) return;
      setBusy(true);
      const r = await post(seat.code, { action: "answer", sid: seat.sid, slide: snap.at, answer });
      setBusy(false);
      if (r.ok) return;
      if (r.status === 0) {
        // no connection: keep the answer on this device and send it the moment the stream is back, if the class is still on this slide
        queued.current = { slide: snap.at, answer };
        toast.show("انقطع الاتصال. سنرسل إجابتك حين يعود.");
      } else toast.show(r.error);
    },
    [snap, seat, toast],
  );

  async function understood() {
    const r = await post(seat.code, { action: "engage", sid: seat.sid });
    toast.show(r.ok ? "المعلّم يرى أنك فهمت." : r.error);
  }
  async function again() {
    const r = await post(seat.code, { action: "repeat", sid: seat.sid });
    toast.show(r.ok ? "أُرسل طلبك: سيعيد المعلّم الشرح." : r.error);
  }

  if (missing || link === "gone") {
    return (
      <Shell>
        <div className="mx-auto mt-16 max-w-sm rounded-3xl border border-violet/10 bg-white p-7 text-center shadow-sm">
          <h1 className="text-xl font-bold text-indigo-deep">انتهت الحصة أو لم تعد متاحة</h1>
          <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/70">إن كانت الحصة لا تزال مفتوحة فادخل بالرمز مرة أخرى.</p>
          <Link href={`/join?code=${seat.code}`} className="mt-5 inline-block rounded-full bg-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30">
            ادخل من جديد
          </Link>
        </div>
      </Shell>
    );
  }
  if (!snap || !lesson || !slide) {
    return (
      <Shell>
        <p role="status" className="mt-24 text-center text-sm font-bold text-indigo-deep/70">جارٍ الاتصال بالحصة…</p>
      </Shell>
    );
  }

  const me = snap.me;
  const group = me.group !== null ? GROUP_POOL[me.group % GROUP_POOL.length] : null;
  const groupMode = snap.mode === "groups";
  const rank = rankOf(me.points);
  const station = slide.kind === "explain" || slide.kind === "challenge" || slide.kind === "reveal" ? lesson.stations[slide.i] : undefined;
  const isBoss = "i" in slide && slide.i === lesson.stations.length;
  // answers and outcomes are keyed by challenge number, the same on the challenge slide and its reveal
  const ci = "i" in slide ? slide.i : -1;
  const answered = me.answered.includes(ci);
  const outcome = me.outcomes[ci];
  const earned = (outcome?.right ?? 0) * POINTS_RIGHT;

  return (
    <Shell group={group && groupMode ? { name: group.name, color: group.color } : null} status={snap.status}>
      {link === "lost" && (
        <p role="alert" className="mx-auto mt-3 max-w-[1000px] rounded-xl bg-amber-50 px-4 py-2 text-center text-xs font-bold text-amber-900">
          انقطع الاتصال، نحاول مجددًا…{" "}
          <button className="underline" onClick={() => setTries((t) => t + 1)}>
            أعد المحاولة
          </button>
        </p>
      )}
      <main className="mx-auto grid w-full max-w-[1000px] flex-1 grid-cols-1 items-start gap-4 px-5 py-5 lg:grid-cols-[1fr_245px]">
        <div className="min-w-0">
          <Progress lesson={lesson} at={slide.kind === "arena" ? -1 : slide.kind === "finish" ? lesson.stations.length + 1 : slide.i} />
          <section className="dots relative overflow-hidden rounded-[28px] bg-gradient-to-b from-[#241356] to-[#4a1d96] p-6 text-white shadow-2xl shadow-indigo-deep/25" aria-live="polite">
            {slide.kind === "arena" && (
              <div className="relative py-6 text-center">
                <p className="text-xs font-semibold text-white/75">الحصة على وشك أن تبدأ</p>
                <h1 className="mt-2 text-[34px] font-bold leading-tight">{lesson.title}</h1>
                <p className="mt-3 text-xs font-medium text-white/80">{plural.students(snap.count)} في الحصة. شاشتك تتبع المعلّم تلقائيًا.</p>
              </div>
            )}

            {slide.kind === "explain" && station && (
              <>
                <p className="relative text-xs font-semibold text-white/75">
                  المحطة {slide.i + 1} من {lesson.stations.length}
                </p>
                <h1 className="relative mt-2 text-[34px] font-bold leading-tight">{station.title}</h1>
                <div className="relative mt-4 rounded-2xl bg-white p-4 text-indigo-deep">
                  <StationView station={station} />
                </div>
              </>
            )}

            {(slide.kind === "challenge" || slide.kind === "reveal") && (
              <>
                <p className="relative text-xs font-semibold text-white/75">
                  {isBoss ? "تحدّي الزعيم" : `التحدي ${slide.i + 1} · ${CHALLENGE_LABELS[station!.challenge.kind]}`}
                </p>
                <div className="relative mt-3 rounded-2xl bg-white p-5 text-indigo-deep">
                  {slide.kind === "challenge" ? (
                    answered ? (
                      <div className="py-6 text-center">
                        <p className="text-lg font-bold">وصلت إجابتك</p>
                        <p className="mt-1 text-xs font-medium text-indigo-deep/70">انتظر المعلّم ليكشف الإجابة الصحيحة.</p>
                      </div>
                    ) : (
                      <LiveChallenge key={snap.at} challenge={isBoss ? undefined : station!.challenge} boss={isBoss ? lesson.boss : undefined} busy={busy} onSubmit={send} />
                    )
                  ) : (
                    <LiveReveal challenge={isBoss ? undefined : station!.challenge} boss={isBoss ? lesson.boss : undefined} outcome={outcome} points={earned} />
                  )}
                </div>
              </>
            )}

            {slide.kind === "finish" && (
              <div className="relative py-6 text-center">
                <p className="text-xs font-semibold text-white/75">انتهت الحصة</p>
                <h1 className="mt-2 text-[34px] font-bold">أحسنت يا {me.name}!</h1>
                <p className="mt-3 text-sm font-semibold text-white/90">
                  جمعت {plural.points(me.points)} · ترتيبك {me.rank} من {snap.count}
                </p>
              </div>
            )}
          </section>

          {slide.kind === "explain" && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button onClick={understood} className="rounded-2xl border border-violet/10 bg-white py-3.5 text-sm font-bold text-indigo-deep shadow-sm transition hover:border-violet/40">
                فهمت
              </button>
              <button onClick={again} disabled={me.askedRepeat} className="rounded-2xl border border-violet/10 bg-white py-3.5 text-sm font-bold text-indigo-deep shadow-sm transition hover:border-violet/40 disabled:opacity-50">
                {me.askedRepeat ? "طلبت الإعادة" : "أعد الشرح"}
              </button>
            </div>
          )}

          {snap.status === "ended" && (
            <Link href="/learn" className="mt-4 block rounded-full bg-brand py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-violet/30">
              إلى مساحتي
            </Link>
          )}
        </div>

        <aside className="space-y-3">
          <section className="rounded-3xl border border-violet/10 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-indigo-deep">نقاط المعرفة</h2>
              <span className="text-base font-bold text-violet">{me.points}</span>
            </div>
            <p className="mt-1.5 text-xs font-medium leading-5 text-indigo-deep/70">
              اضغط «فهمت» أثناء الشرح لتكسب {POINTS_ENGAGE} نقطة، وحتى {ENGAGE_CAP_PER_STATION} نقاط في كل محطة. وكل إجابة صحيحة من أول مرة تكسبك {POINTS_RIGHT}.
            </p>
            <span className="mt-3 inline-block rounded-full bg-sun px-3.5 py-1.5 text-xs font-bold text-indigo-deep">الرتبة: {rank.name}</span>
          </section>

          <section className="dots relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#241356] to-[#4a1d96] p-4 text-white shadow-xl shadow-indigo-deep/25">
            {groupMode ? (
              <>
                <h2 className="relative text-lg font-bold">المجموعات</h2>
                <ol className="relative mt-3 space-y-1.5">
                  {[...snap.groups].sort((a, b) => b.score - a.score).map((g) => {
                    const info = GROUP_POOL[g.group % GROUP_POOL.length];
                    const mine = g.group === me.group;
                    return (
                      <li key={g.group} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold ${mine ? "bg-white/20 ring-1 ring-white/40" : "bg-white/10"}`}>
                        <span className="size-2.5 rounded-[3px]" style={{ background: info.color }} />
                        <span className="flex-1">{info.name}{mine ? "، مجموعتك" : ""}</span>
                        <span>{g.score}</span>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : (
              <>
                <h2 className="relative text-lg font-bold">ترتيبك</h2>
                <p className="relative mt-1 flex items-baseline gap-2">
                  <span className="text-[44px] font-bold leading-none">{me.rank}</span>
                  <span className="text-xs font-semibold text-white/75">من {snap.count}</span>
                </p>
                <ol className="relative mt-3 space-y-1.5">
                  {snap.top.slice(0, 3).map((p, i) => (
                    <li key={i} className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold ${p.me ? "bg-white/25 ring-1 ring-white/40" : "bg-white/10"}`}>
                      <span>{i + 1}. {p.name}</span>
                      <span>{p.points}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>

          <Outline lesson={lesson} at={slide.kind === "arena" ? -1 : slide.kind === "finish" ? lesson.stations.length + 1 : slide.i} />

          <button onClick={() => (snap.status === "ended" ? router.push("/learn") : setLeaving(true))} className="block w-full rounded-2xl border border-violet/10 bg-white py-3 text-center text-xs font-bold text-violet transition hover:border-violet/40">
            غادر الحصة
          </button>
        </aside>
      </main>
      {leaving && (
        <Overlay label="مغادرة الحصة">
          <h2 className="text-xl font-bold text-indigo-deep">تغادر الحصة؟</h2>
          <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/70">تنقطع عن شاشة المعلّم، وتبقى نقاطك محفوظة. تستطيع العودة بالرمز نفسه ما دامت الحصة مفتوحة.</p>
          <div className="mt-5 flex gap-2.5">
            <button autoFocus onClick={() => setLeaving(false)} className="flex-1 rounded-full bg-brand py-3 text-sm font-bold text-white shadow-lg shadow-violet/30">
              ابقَ في الحصة
            </button>
            <Link href="/learn" className="rounded-full border border-violet/15 px-6 py-3 text-xs font-bold leading-[1.6] text-violet">
              غادر
            </Link>
          </div>
        </Overlay>
      )}
      {toast.node}
    </Shell>
  );
}

function Shell({ children, group, status }: { children: React.ReactNode; group?: { name: string; color: string } | null; status?: "running" | "ended" }) {
  return (
    <>
      <PlayHeader>
        <span className="hidden rounded-full bg-violet/10 px-4 py-2 text-xs font-bold text-violet sm:block">{status === "ended" ? "انتهت الحصة" : "في الحصة: المعلّم يقود الدرس"}</span>
        <NamePill group={group} />
      </PlayHeader>
      {children}
    </>
  );
}

/** where the class is, at a glance: the stations done, the one on screen, the ones still to come, and the boss round */
function Progress({ lesson, at }: { lesson: Lesson; at: number }) {
  const total = lesson.stations.length;
  const left = Math.max(0, total - Math.max(0, at) - (at >= 0 && at < total ? 1 : 0));
  return (
    <div className="mb-3 rounded-2xl border border-violet/10 bg-white px-4 py-3 shadow-sm" aria-label="تقدّم الحصة">
      <ol className="flex items-center gap-1.5">
        {lesson.stations.map((s, i) => (
          <li key={s.id} title={s.title} aria-current={i === at ? "step" : undefined} className="flex-1">
            <span className={`block h-1.5 rounded-full ${i < at ? "bg-mint" : i === at ? "bg-violet" : "bg-violet/15"}`} />
          </li>
        ))}
        <li aria-current={at === total ? "step" : undefined} className="flex-1" title="تحدّي الزعيم">
          <span className={`block h-1.5 rounded-full ${at > total ? "bg-mint" : at === total ? "bg-pink-card" : "bg-violet/15"}`} />
        </li>
      </ol>
      <p className="mt-2 text-xs font-bold text-indigo-deep/70">
        {at < 0
          ? `ستبدأ الحصة قريبًا: ${plural.stations(total)} ثم تحدّي الزعيم.`
          : at > total
            ? "انتهت المحطات وتحدّي الزعيم."
            : at === total
              ? "تحدّي الزعيم: آخر ما في الحصة."
              : left > 0
                ? `المحطة ${at + 1} من ${total} · تبقّى ${plural.stations(left)} ثم تحدّي الزعيم.`
                : `المحطة ${at + 1} من ${total}، وهي الأخيرة · ثم تحدّي الزعيم.`}
      </p>
    </div>
  );
}

/** the whole plan of the lesson, so the student always knows what is still ahead */
function Outline({ lesson, at }: { lesson: Lesson; at: number }) {
  const total = lesson.stations.length;
  const row = (key: string, n: string, title: string, state: "done" | "now" | "next") => (
    <li key={key} aria-current={state === "now" ? "step" : undefined} className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-bold ${state === "now" ? "bg-violet/10 text-violet" : state === "done" ? "text-indigo-deep/70" : "text-indigo-deep/75"}`}>
      <span className={`grid size-5 shrink-0 place-items-center rounded-full text-xs ${state === "done" ? "bg-mint text-white" : state === "now" ? "bg-violet text-white" : "bg-violet/10 text-indigo-deep/70"}`}>{state === "done" ? "✓" : n}</span>
      <span className="min-w-0 flex-1 truncate">{title}</span>
    </li>
  );
  return (
    <section className="rounded-3xl border border-violet/10 bg-white p-3.5 shadow-sm" aria-label="خطة الحصة">
      <h2 className="px-1 pb-1.5 text-xs font-bold text-indigo-deep">خطة الحصة</h2>
      <ol className="space-y-0.5">
        {lesson.stations.map((s, i) => row(s.id, String(i + 1), s.title, i < at ? "done" : i === at ? "now" : "next"))}
        {row("boss", "★", "تحدّي الزعيم", at > total ? "done" : at === total ? "now" : "next")}
      </ol>
    </section>
  );
}
