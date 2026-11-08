import "server-only";
import { fs } from "./firestore";

/**
 * Product events, kept in our own Firestore (collection `events`). They answer one question: where do teachers
 * drop off between signing up and building a second lesson. Nothing about a student is stored: no names, no
 * accounts, no devices; a student joining is only a count, with the lesson mode.
 */
export const EVENTS = [
  "signup_completed",
  "lesson_build_started",
  "lesson_build_succeeded",
  "lesson_build_failed",
  "lesson_shared",
  "session_started",
  "student_joined",
  "lesson_completed",
  "second_lesson_started",
  "upgrade_viewed",
  "upgrade_clicked",
] as const;
export type EventName = (typeof EVENTS)[number];

/** the events a browser may report itself (the rest are only ever written by the server) */
export const CLIENT_EVENTS: EventName[] = ["upgrade_viewed", "upgrade_clicked"];

type Props = Record<string, string | number | boolean>;

/** fire and forget: measuring must never slow down or break the thing being measured */
export function track(name: EventName, who?: { userId?: string }, props?: Props): void {
  const small: Props = {};
  for (const [k, v] of Object.entries(props ?? {}).slice(0, 6)) small[k.slice(0, 30)] = typeof v === "string" ? v.slice(0, 60) : v;
  fs()
    .collection("events")
    .add({ name, userId: who?.userId ?? null, props: small, at: Date.now() })
    .catch((e) => console.error("[qafza] event not saved:", name, e instanceof Error ? e.message : e));
}

export type FunnelStep = { name: EventName; label: string; users: number; events: number };

const STEPS: { name: EventName; label: string }[] = [
  { name: "signup_completed", label: "سجّل حسابًا" },
  { name: "lesson_build_started", label: "بدأ بناء درس" },
  { name: "lesson_build_succeeded", label: "نجح بناء الدرس" },
  { name: "lesson_shared", label: "شارك الدرس" },
  { name: "session_started", label: "بدأ حصة مباشرة" },
  { name: "second_lesson_started", label: "بدأ درسه الثاني" },
];
const EXTRA: { name: EventName; label: string }[] = [
  { name: "lesson_build_failed", label: "فشل بناء درس" },
  { name: "student_joined", label: "دخل طالب" },
  { name: "lesson_completed", label: "أنهى طالب درسًا" },
  { name: "upgrade_viewed", label: "رأى صفحة الاشتراك" },
  { name: "upgrade_clicked", label: "ضغط الاشتراك" },
];

/** unique teachers (and total events) per step, over the last `days` days */
export async function funnel(days: number): Promise<{ steps: FunnelStep[]; extra: FunnelStep[]; since: number }> {
  const since = Date.now() - days * 86_400_000;
  const snap = await fs().collection("events").where("at", ">=", since).select("name", "userId").get();
  const users = new Map<string, Set<string>>();
  const counts = new Map<string, number>();
  for (const d of snap.docs) {
    const { name, userId } = d.data() as { name: string; userId: string | null };
    counts.set(name, (counts.get(name) ?? 0) + 1);
    if (userId) (users.get(name) ?? users.set(name, new Set()).get(name)!).add(userId);
  }
  const row = (s: { name: EventName; label: string }): FunnelStep => ({ ...s, users: users.get(s.name)?.size ?? 0, events: counts.get(s.name) ?? 0 });
  return { steps: STEPS.map(row), extra: EXTRA.map(row), since };
}

/** the people allowed to see the funnel: addresses listed in ADMIN_EMAILS (comma separated). Nobody, until it is set. */
export const isAdmin = (email: string) =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
