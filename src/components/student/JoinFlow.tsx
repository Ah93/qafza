"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "../Logo";
import { useFlow } from "../teacher/FlowProvider";
import { api, postJson } from "@/lib/client-api";
import { DEFAULT_SHARE, type Lesson, type ShareConfig } from "@/lib/lesson";
import { SAMPLE_CODE } from "../useLessonByCode";
import { GROUP_POOL, ROSTER } from "@/lib/live";
import { useStudent } from "./StudentProvider";

type Step = "code" | "name" | "wait" | "group" | "board" | "class";
const LEN = 4;

type LessonReply = { kind: "lesson"; lesson: Lesson; share: ShareConfig; teacher: string; className: string | null };
type ClassReply = { kind: "class"; className: string; lessons: { code: string; title: string }[] };
type SeatReply = { sid: string; group: number | null; mates: string[]; mode: "groups" | "individual"; groupCount: number };

const sidKey = (code: string) => `qafza:sid:${code}`;

function Stripe({ n }: { n: number }) {
  return (
    <div className="flex gap-2" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full transition ${i < n ? "bg-brand" : "bg-violet/10"}`} />
      ))}
    </div>
  );
}

export function JoinFlow({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const { share: flowShare, sample } = useFlow();
  const { name, setName, deviceRef, joined, setJoined, seat, setSeat } = useStudent();

  const [step, setStep] = useState<Step>("code");
  const [chars, setChars] = useState<string[]>(() => {
    const c = initialCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, LEN).split("");
    return Array.from({ length: LEN }, (_, i) => c[i] ?? "");
  });
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState<string | null>(null);
  const [klass, setKlass] = useState<ClassReply | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const first = typed ?? name;
  const code = chars.join("");
  const isDemo = joined?.code === SAMPLE_CODE;
  const share = joined?.share ?? DEFAULT_SHARE;
  const selfPaced = share.how === "self";
  const boardOnly = share.devices === "board";
  const groups = share.grouping === "groups" || boardOnly;

  function set(i: number, v: string) {
    const clean = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setError(null);
    setNeedsLogin(false);
    if (!clean) return setChars((c) => c.map((x, j) => (j === i ? "" : x)));
    setChars((c) => {
      const next = [...c];
      clean.slice(0, LEN - i).split("").forEach((ch, k) => (next[i + k] = ch));
      return next;
    });
    refs.current[Math.min(i + clean.length, LEN - 1)]?.focus();
  }

  const lookup = useCallback(
    async (c: string) => {
      if (c.length < LEN) return setError("اكتب الرمز كاملًا: أربع خانات.");
      setBusy(true);
      setNeedsLogin(false);
      setError(null);

      if (c === SAMPLE_CODE) {
        // the built-in demo lesson: it follows the choices made in this browser
        const cfg = { ...DEFAULT_SHARE, how: flowShare.how, devices: flowShare.devices, grouping: flowShare.grouping, groupCount: flowShare.groupCount };
        setJoined({ code: c, lesson: sample, share: cfg, teacher: "", className: null });
        setBusy(false);
        return setStep(cfg.devices === "board" && cfg.how === "live" ? "board" : "name");
      }

      const r = await api<LessonReply | ClassReply>(`/api/join/${c}`);
      setBusy(false);
      if (!r.ok) {
        setNeedsLogin(r.status === 403);
        return setError(r.error);
      }
      if (r.data.kind === "class") {
        setKlass(r.data);
        return setStep("name");
      }
      const d = r.data;
      setKlass(null);
      setJoined({ code: c, lesson: d.lesson, share: d.share, teacher: d.teacher, className: d.className });
      setStep(d.share.devices === "board" && d.share.how === "live" ? "board" : "name");
    },
    [flowShare, sample, setJoined],
  );

  // a link or QR code carries the code: go straight to the next step
  const auto = useRef(false);
  useEffect(() => {
    if (auto.current || initialCode.length !== LEN) return;
    auto.current = true;
    void Promise.resolve().then(() => lookup(initialCode.toUpperCase()));
  }, [initialCode, lookup]);

  /** take a seat in the live session; false when the teacher has not opened it yet */
  const sit = useCallback(
    async (quiet: boolean): Promise<boolean> => {
      if (!joined) return false;
      let sid: string | undefined;
      try {
        sid = sessionStorage.getItem(sidKey(joined.code)) ?? undefined;
      } catch {}
      const r = await api<SeatReply & { notOpen?: boolean }>(`/api/live/${joined.code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", name: first.trim(), ref: deviceRef, sid }),
      });
      if (!r.ok) {
        if (r.status === 409 && r.error.includes("لم يفتح")) {
          setStep("wait");
          return false;
        }
        if (!quiet) {
          setNeedsLogin(r.status === 403);
          setError(r.error);
          setStep("name");
        }
        return false;
      }
      try {
        sessionStorage.setItem(sidKey(joined.code), r.data.sid);
      } catch {}
      const mine = { code: joined.code, sid: r.data.sid, group: r.data.group, mates: r.data.mates, mode: r.data.mode, groupCount: r.data.groupCount };
      try {
        sessionStorage.setItem("qafza:seat", JSON.stringify(mine));
      } catch {}
      setSeat(mine);
      if (r.data.mode === "groups" && r.data.group !== null) setStep("group");
      else router.push("/play/live");
      return true;
    },
    [joined, first, deviceRef, router, setSeat],
  );

  // while the teacher has not opened the session, keep knocking
  useEffect(() => {
    if (step !== "wait") return;
    const t = setInterval(() => void sit(true), 3000);
    return () => clearInterval(t);
  }, [step, sit]);

  async function submitName(e: React.FormEvent) {
    e.preventDefault();
    const n = first.trim();
    if (!n) return setError("اكتب اسمك الأول.");
    setName(n);
    setError(null);
    setBusy(true);

    if (klass) {
      const r = await postJson<{ className: string }>(`/api/join/${code}`, { name: n });
      setBusy(false);
      if (!r.ok) return setError(r.error);
      return setStep("class");
    }
    if (selfPaced) {
      setBusy(false);
      return router.push("/play/joined");
    }
    if (isDemo) {
      setBusy(false);
      setSeat(null);
      return groups ? setStep("group") : router.push("/play/live");
    }
    await sit(false);
    setBusy(false);
  }

  const progress = step === "name" || step === "wait" ? 2 : step === "group" ? 3 : step === "class" ? 3 : 1;
  const seatGroup = seat?.group ?? 0;
  const group = GROUP_POOL[seatGroup % GROUP_POOL.length];
  const mates = isDemo ? ROSTER.filter((n) => n !== "يوسف").slice(0, 5) : (seat?.mates ?? []);
  const groupCount = isDemo ? share.groupCount : (seat?.groupCount ?? share.groupCount);

  return (
    <>
      <header className="border-b border-violet/5 bg-white/80">
        <div className="mx-auto flex h-[56px] max-w-[1080px] items-center justify-between px-5">
          <Logo />
          <Link href="/" className="text-[11px] font-bold text-violet underline underline-offset-4">
            خروج
          </Link>
        </div>
      </header>

      <main className="grid flex-1 place-items-start px-5 pt-12 sm:pt-16">
        <div className="mx-auto w-full max-w-[440px] rounded-[28px] border border-violet/10 bg-white px-8 pb-8 pt-7 text-center shadow-xl shadow-violet/10">
          <Stripe n={progress} />

          {step === "code" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void lookup(code);
              }}
            >
              <h1 className="mt-5 text-[30px] font-bold leading-tight text-indigo-deep">ادخل رمز اللعبة</h1>
              <p className="mt-2 text-xs font-medium text-indigo-deep/60">تجده على السبورة أو في رسالة معلّمك. لا تحتاج حسابًا.</p>

              <div dir="ltr" className={`mt-5 flex justify-center gap-2.5 ${error ? "animate-[shake_.35s]" : ""}`}>
                {chars.map((c, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      refs.current[i] = el;
                    }}
                    value={c}
                    autoFocus={i === 0}
                    autoCapitalize="characters"
                    autoComplete="off"
                    aria-label={`الخانة ${i + 1}`}
                    aria-invalid={!!error}
                    onChange={(e) => set(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !chars[i] && i > 0) refs.current[i - 1]?.focus();
                    }}
                    className={`size-[58px] rounded-2xl border-2 text-center text-[26px] font-bold text-indigo-deep outline-none transition focus:border-violet focus:ring-4 focus:ring-violet/10 ${
                      error ? "border-rose-400 bg-rose-50" : "border-violet/25 bg-white"
                    }`}
                  />
                ))}
              </div>
              {error && (
                <p role="alert" className="mt-3 text-xs font-bold text-[#c0174f]">
                  {error}
                </p>
              )}
              {needsLogin && (
                <Link href={`/login?next=${encodeURIComponent("/join?code=" + code)}`} className="mt-2 inline-block text-xs font-bold text-violet underline underline-offset-4">
                  سجّل الدخول للمتابعة
                </Link>
              )}

              <button
                disabled={busy}
                className="mt-5 w-full rounded-full bg-brand py-3.5 text-base font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110 disabled:opacity-60"
              >
                {busy ? "جارٍ التحقق…" : "ادخل"}
              </button>
              <p className="mt-3 text-[11px] font-semibold text-indigo-deep/55">أو امسح رمز QR من السبورة بكاميرا جوالك</p>
            </form>
          )}

          {step === "board" && (
            <div>
              <h1 className="mt-5 text-[28px] font-bold leading-tight text-indigo-deep">هذه حصة على السبورة</h1>
              <p className="mt-3 rounded-2xl bg-violet/[0.06] px-4 py-3.5 text-xs font-medium leading-6 text-indigo-deep/80">
                معلّمك يقود الحصة من السبورة، والمجموعات ترفع بطاقات الإجابة. لا تحتاج جهازك الآن، فاجلس مع مجموعتك.
              </p>
              <Link href="/" className="mt-5 block rounded-full bg-brand py-3.5 text-sm font-bold text-white shadow-lg shadow-violet/30">
                حسنًا
              </Link>
            </div>
          )}

          {step === "name" && (
            <form onSubmit={submitName}>
              <h1 className="mt-5 text-[28px] font-bold leading-tight text-indigo-deep">ما اسمك الأول؟</h1>
              {(klass?.className ?? joined?.className) && (
                <p className="mt-2 text-xs font-semibold text-violet">الصف: {klass?.className ?? joined?.className}</p>
              )}
              <p className="mt-2 text-xs font-medium text-indigo-deep/60">اسمك الأول فقط يكفي. سيراه معلّمك وزملاؤك.</p>
              <input
                autoFocus
                value={first}
                onChange={(e) => {
                  setTyped(e.target.value);
                  setError(null);
                }}
                placeholder="يوسف"
                aria-label="اسمك الأول"
                maxLength={20}
                className="mt-5 w-full rounded-2xl border-2 border-violet/25 bg-white px-5 py-4 text-center text-xl font-bold text-indigo-deep outline-none transition placeholder:text-indigo-deep/30 focus:border-violet focus:ring-4 focus:ring-violet/10"
              />
              {error && (
                <p role="alert" className="mt-3 text-xs font-bold text-[#c0174f]">
                  {error}
                </p>
              )}
              {needsLogin && (
                <Link href={`/login?next=${encodeURIComponent("/join?code=" + code)}`} className="mt-2 inline-block text-xs font-bold text-violet underline underline-offset-4">
                  سجّل الدخول للمتابعة
                </Link>
              )}
              <button
                disabled={busy || !first.trim()}
                className="mt-4 w-full rounded-full bg-brand py-3.5 text-base font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110 disabled:opacity-50"
              >
                {busy ? "لحظة…" : klass ? "انضم إلى الصف" : selfPaced ? "ابدأ الدرس" : groups ? "التالي: اعرف مجموعتك" : "ادخل الحصة"}
              </button>
              <button type="button" onClick={() => { setStep("code"); setJoined(null); setKlass(null); }} className="mt-3 text-[11px] font-bold text-violet underline underline-offset-4">
                رمز آخر
              </button>
            </form>
          )}

          {step === "wait" && (
            <div role="status" aria-live="polite">
              <span className="mx-auto mt-6 block size-14 animate-pulse rounded-full bg-brand/15" />
              <h1 className="mt-4 text-[26px] font-bold leading-tight text-indigo-deep">بانتظار المعلّم</h1>
              <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/65">
                لم يفتح المعلّم الحصة بعد. اترك هذه الصفحة مفتوحة، وتدخل تلقائيًا ما إن تبدأ.
              </p>
              <button onClick={() => setStep("name")} className="mt-4 text-[11px] font-bold text-violet underline underline-offset-4">
                غيّر اسمي
              </button>
            </div>
          )}

          {step === "group" && (
            <div>
              <h1 className="mt-5 text-[28px] font-bold leading-tight text-indigo-deep">وجدنا مجموعتك!</h1>
              <p className="mt-2 text-xs font-medium text-indigo-deep/60">
                {joined?.className ? `من «صفوفي»: ${joined.className}. مجموعتك جاهزة، ولا تختارها بنفسك.` : "وزّعنا الطلاب على المجموعات بالتناوب، فأنت هنا."}
              </p>
              <div className="mt-5 rounded-3xl border-2 p-5" style={{ borderColor: group.color }}>
                <span className="mx-auto block size-5 rounded-md" style={{ background: group.color }} />
                <p className="mt-2 text-2xl font-bold text-indigo-deep">مجموعة {group.name}</p>
                <p className="mt-1 text-[11px] font-semibold text-indigo-deep/55">من {groupCount} مجموعات متقاربة في العدد والمستوى</p>
                {mates.length > 0 && (
                  <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {mates.map((m) => (
                      <li key={m} className="rounded-full bg-violet/[0.07] px-3 py-1 text-[11px] font-bold text-indigo-deep">
                        {m}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button onClick={() => router.push("/play/live")} className="mt-5 w-full rounded-full bg-brand py-3.5 text-base font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110">
                ادخل الحصة
              </button>
            </div>
          )}

          {step === "class" && klass && (
            <div>
              <h1 className="mt-5 text-[28px] font-bold leading-tight text-indigo-deep">أهلًا في «{klass.className}»</h1>
              <p className="mt-2 text-xs font-medium text-indigo-deep/60">أُضفت إلى الصف، وستظهر نتائجك عند معلّمك.</p>
              {klass.lessons.length ? (
                <ul className="mt-5 space-y-2.5 text-start">
                  {klass.lessons.map((l) => (
                    <li key={l.code}>
                      <button
                        onClick={() => {
                          setChars(l.code.split(""));
                          setKlass(null);
                          setStep("code");
                          void lookup(l.code);
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-violet/15 bg-white px-4 py-3.5 text-sm font-bold text-indigo-deep transition hover:border-violet/40"
                      >
                        {l.title}
                        <span className="text-xs text-violet">العب</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 rounded-2xl bg-violet/[0.06] px-4 py-3.5 text-xs font-medium leading-6 text-indigo-deep/75">لا دروس منشورة لهذا الصف بعد. حين ينشر معلّمك درسًا، ادخل برمزه.</p>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
