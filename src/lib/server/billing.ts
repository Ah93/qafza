import "server-only";
import { FREE_LESSONS, PLAN_DAYS, PRICES, type Currency, type PayMethod, type PlanId, type PlanStatus } from "../pricing";
import { fs, increment, newId } from "./firestore";

/**
 * Teachers get FREE_LESSONS lessons for free (counted for life, so deleting one does not buy another); after that
 * an active pass is needed. Students never pay. A pass is a fixed period (30 or 365 days) that the teacher renews:
 * no card is stored and nothing renews by itself, which also suits mada and STC Pay.
 */

type SubDoc = { plan: PlanId; currency: Currency; amount: number; status: "active"; startedAt: number; currentPeriodEnd: number; provider: string; providerRef: string | null; updatedAt: number };
type CheckoutDoc = { userId: string; plan: PlanId; currency: Currency; method: PayMethod; amount: number; status: "pending" | "paid" | "canceled"; createdAt: number; expiresAt: number };

const subs = () => fs().collection("subscriptions");
const checkouts = () => fs().collection("checkouts");
const users = () => fs().collection("users");

/** which payment provider is connected. Only "test" exists so far, and never in production. */
export function provider(): "test" | null {
  return process.env.BILLING_PROVIDER === "test" && process.env.NODE_ENV !== "production" ? "test" : null;
}

async function subscriptionOf(uid: string): Promise<SubDoc | null> {
  const d = await subs().doc(uid).get();
  const s = d.data() as SubDoc | undefined;
  return s && s.currentPeriodEnd > Date.now() ? s : null;
}

/** how many lessons this account ever created; accounts from before the counter existed are counted from their lessons */
async function lessonsCreated(uid: string): Promise<number> {
  const u = (await users().doc(uid).get()).data() as { lessonsCreated?: number } | undefined;
  if (typeof u?.lessonsCreated === "number") return u.lessonsCreated;
  const n = (await fs().collection("lessons").where("userId", "==", uid).count().get()).data().count;
  await users().doc(uid).set({ lessonsCreated: n }, { merge: true });
  return n;
}

export async function planStatus(uid: string): Promise<PlanStatus> {
  const [sub, made] = await Promise.all([subscriptionOf(uid), lessonsCreated(uid)]);
  const entitled = !!sub;
  return {
    entitled,
    plan: sub?.plan ?? null,
    until: sub?.currentPeriodEnd ?? null,
    lessonsCreated: made,
    freeLimit: FREE_LESSONS,
    canCreate: entitled || made < FREE_LESSONS,
    payments: provider() ?? "off",
  };
}

export const PAYWALL_MESSAGE = "استخدمت درسك المجاني. لدرسك التالي وكل ما بعده، اشترك في قفزة الكاملة. طلابك يلعبون مجانًا دائمًا.";

/**
 * Takes one lesson slot for a new lesson, atomically (two requests at once cannot both take the last free one).
 * Give it back with releaseLessonSlot when the lesson could not be created.
 */
export async function reserveLessonSlot(uid: string): Promise<boolean> {
  if (await subscriptionOf(uid)) {
    await lessonsCreated(uid); // makes sure the counter exists before it is incremented
    await users().doc(uid).set({ lessonsCreated: increment(1) }, { merge: true });
    return true;
  }
  const have = await lessonsCreated(uid);
  const ref = users().doc(uid);
  return fs().runTransaction(async (tx) => {
    const now = ((await tx.get(ref)).data() as { lessonsCreated?: number } | undefined)?.lessonsCreated ?? have;
    if (now >= FREE_LESSONS) return false;
    tx.set(ref, { lessonsCreated: now + 1 }, { merge: true });
    return true;
  });
}

export async function releaseLessonSlot(uid: string) {
  const ref = users().doc(uid);
  await fs().runTransaction(async (tx) => {
    const n = ((await tx.get(ref)).data() as { lessonsCreated?: number } | undefined)?.lessonsCreated ?? 0;
    tx.set(ref, { lessonsCreated: Math.max(0, n - 1) }, { merge: true });
  });
}

/* ---------- paying ---------- */

export async function createCheckout(uid: string, plan: PlanId, currency: Currency, method: PayMethod): Promise<string> {
  const id = newId();
  const now = Date.now();
  await checkouts().doc(id).set({ userId: uid, plan, currency, method, amount: PRICES[currency][plan], status: "pending", createdAt: now, expiresAt: now + 30 * 60_000 } satisfies CheckoutDoc);
  return id;
}

export async function getCheckout(uid: string, id: string): Promise<(CheckoutDoc & { id: string }) | null> {
  const d = await checkouts().doc(id).get();
  const c = d.data() as CheckoutDoc | undefined;
  return c && c.userId === uid ? { id, ...c } : null;
}

/** a payment that went through: starts the pass, or extends the one still running */
export async function activate(uid: string, plan: PlanId, currency: Currency, amount: number, providerName: string, ref: string | null) {
  const now = Date.now();
  const ref_ = subs().doc(uid);
  await fs().runTransaction(async (tx) => {
    const cur = (await tx.get(ref_)).data() as SubDoc | undefined;
    const from = cur && cur.currentPeriodEnd > now ? cur.currentPeriodEnd : now;
    tx.set(ref_, { plan, currency, amount, status: "active", startedAt: cur && cur.currentPeriodEnd > now ? cur.startedAt : now, currentPeriodEnd: from + PLAN_DAYS[plan] * 86_400_000, provider: providerName, providerRef: ref, updatedAt: now } satisfies SubDoc);
  });
}

/** the test provider's "I paid" / "I cancelled" button. Each payment session can be used once. */
export async function finishTestCheckout(uid: string, id: string, paid: boolean): Promise<"ok" | "gone" | "used"> {
  const ref = checkouts().doc(id);
  const taken = await fs().runTransaction(async (tx) => {
    const c = (await tx.get(ref)).data() as CheckoutDoc | undefined;
    if (!c || c.userId !== uid) return "gone" as const;
    if (c.status !== "pending") return "used" as const;
    if (c.expiresAt < Date.now()) return "gone" as const;
    tx.update(ref, { status: paid ? "paid" : "canceled" });
    return c;
  });
  if (typeof taken === "string") return taken;
  if (paid) await activate(uid, taken.plan, taken.currency, taken.amount, "test", id);
  return "ok";
}
