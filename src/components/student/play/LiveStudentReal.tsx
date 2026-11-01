"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/teacher/Toast";
import { useLessonByCode } from "@/components/useLessonByCode";
import { api } from "@/lib/client-api";
import { CHALLENGE_LABELS } from "@/lib/lesson";
import { GROUP_POOL } from "@/lib/live";
import { buildSlides, ENGAGE_CAP_PER_STATION, POINTS_RIGHT, type LiveAnswer, type StudentSnap } from "@/lib/live-flow";
import { rankOf } from "@/lib/play";
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
  const [snap, setSnap] = useState<StudentSnap | null>(null);
  const [link, setLink] = useState<Conn>("connecting");
  const [busy, setBusy] = useState(false);
  const [tries, setTries] = useState(0);
  const lastKey = useRef("");

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

  const send = useCallback(
    async (answer: LiveAnswer) => {
      if (!snap) return;
      setBusy(true);
      const r = await post(seat.code, { action: "answer", sid: seat.sid, slide: snap.at, answer });
      setBusy(false);
      if (!r.ok) toast.show(r.error);
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
          <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/60">إن كانت الحصة لا تزال مفتوحة فادخل بالرمز مرة أخرى.</p>
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
        <p role="status" className="mt-24 text-center text-sm font-bold text-indigo-deep/60">جارٍ الاتصال بالحصة…</p>
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
      <main className="mx-auto grid w-full max-w-[1000px] flex-1 items-start gap-4 px-5 py-5 lg:grid-cols-[1fr_245px]">
        <div>
          <section className="dots relative overflow-hidden rounded-[28px] bg-gradient-to-b from-[#241356] to-[#4a1d96] p-6 text-white shadow-2xl shadow-indigo-deep/25" aria-live="polite">
            {slide.kind === "arena" && (
              <div className="relative py-6 text-center">
                <p className="text-[11px] font-semibold text-white/75">الحصة على وشك أن تبدأ</p>
                <h1 className="mt-2 text-[34px] font-bold leading-tight">{lesson.title}</h1>
                <p className="mt-3 text-xs font-medium text-white/80">{snap.count} طلاب في الحصة. شاشتك تتبع المعلّم تلقائيًا.</p>
              </div>
            )}

            {slide.kind === "explain" && station && (
              <>
                <p className="relative text-[11px] font-semibold text-white/75">
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
                <p className="relative text-[11px] font-semibold text-white/75">
                  {isBoss ? "تحدّي الزعيم" : `التحدي ${slide.i + 1} · ${CHALLENGE_LABELS[station!.challenge.kind]}`}
                </p>
                <div className="relative mt-3 rounded-2xl bg-white p-5 text-indigo-deep">
                  {slide.kind === "challenge" ? (
                    answered ? (
                      <div className="py-6 text-center">
                        <p className="text-lg font-bold">وصلت إجابتك</p>
                        <p className="mt-1 text-xs font-medium text-indigo-deep/60">انتظر المعلّم ليكشف الإجابة الصحيحة.</p>
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
                <p className="text-[11px] font-semibold text-white/75">انتهت الحصة</p>
                <h1 className="mt-2 text-[34px] font-bold">أحسنت يا {me.name}!</h1>
                <p className="mt-3 text-sm font-semibold text-white/90">
                  جمعت {me.points} نقطة · ترتيبك {me.rank} من {snap.count}
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
            <p className="mt-1.5 text-[11px] font-medium text-indigo-deep/55">نقاط المتابعة في المحطات: حتى {ENGAGE_CAP_PER_STATION} لكل محطة</p>
            <span className="mt-3 inline-block rounded-full bg-sun px-3.5 py-1.5 text-[11px] font-bold text-indigo-deep">الرتبة: {rank.name}</span>
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

          <Link href="/learn" className="block rounded-2xl border border-violet/10 bg-white py-3 text-center text-[11px] font-bold text-violet transition hover:border-violet/40">
            غادر الحصة
          </Link>
        </aside>
      </main>
      {toast.node}
    </Shell>
  );
}

function Shell({ children, group, status }: { children: React.ReactNode; group?: { name: string; color: string } | null; status?: "running" | "ended" }) {
  return (
    <>
      <PlayHeader>
        <span className="hidden rounded-full bg-violet/10 px-4 py-2 text-[11px] font-bold text-violet sm:block">{status === "ended" ? "انتهت الحصة" : "في الحصة: المعلّم يقود الدرس"}</span>
        <NamePill group={group} />
      </PlayHeader>
      {children}
    </>
  );
}
