import "server-only";
import { createHash } from "node:crypto";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * The one place that opens Firestore. Credentials come from the environment and are only ever read on the server:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY   (a service account)
 * or FIRESTORE_EMULATOR_HOST (+ FIREBASE_PROJECT_ID) to work against the local emulator with no credentials.
 */
function app(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (process.env.FIRESTORE_EMULATOR_HOST) return initializeApp({ projectId: projectId || "qafza-local" });

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firestore is not configured: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local (see .env.example).");
  }
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const g = globalThis as unknown as { __qafzaFs?: Firestore };

/** a single Firestore handle per server process (kept across hot reloads in development) */
export function fs(): Firestore {
  if (g.__qafzaFs) return g.__qafzaFs;
  const db = getFirestore(app());
  db.settings({ ignoreUndefinedProperties: true });
  g.__qafzaFs = db;
  return db;
}

export const increment = (n: number) => FieldValue.increment(n);
export const newId = () => crypto.randomUUID();

/** a stable, safe document id for a free-text key (an email, a student's name): ids cannot contain "/" */
export const keyId = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 40);

/** Firestore's "already exists" error, as raised by create() */
export const alreadyExists = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: number }).code === 6;

export const dayOf = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

/** delete every document in `collection` whose `field` equals `value` (in batches: Firestore allows 500 writes at once) */
export async function deleteWhere(collection: string, field: string, value: string | number | null): Promise<number> {
  let total = 0;
  for (;;) {
    const snap = await fs().collection(collection).where(field, "==", value).limit(400).get();
    if (snap.empty) return total;
    const batch = fs().batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
    if (snap.size < 400) return total;
  }
}

/** set `field` to `to` on every document where it equals `value` */
export async function reassignWhere(collection: string, field: string, value: string, to: string | null): Promise<void> {
  const snap = await fs().collection(collection).where(field, "==", value).get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = fs().batch();
    snap.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { [field]: to }));
    await batch.commit();
  }
}
