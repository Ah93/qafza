import "server-only";
import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { fs } from "./firestore";
import { createUser, type NewUser } from "./users";

/**
 * A child under 13 has no account until a parent agrees. Until then only this request exists (it keeps a password
 * hash, nothing else about the child), and it disappears after 7 days or as soon as the parent answers.
 */
export const CONSENT_DAYS = 7;

export type ConsentStatus = "pending" | "deciding" | "approved" | "declined" | "failed";

type ConsentDoc = {
  first: string;
  last: string;
  email: string;
  passwordHash: string | null;
  role: "teach" | "learn";
  country: string | null;
  birthYear: number;
  parentEmail: string | null;
  /** how many times the parent was emailed (capped, so the form cannot be used to spam an address) */
  sends: number;
  status: ConsentStatus;
  createdAt: number;
  expiresAt: number;
};

const consents = () => fs().collection("consents");

export async function createConsent(c: Pick<ConsentDoc, "first" | "last" | "email" | "passwordHash" | "role" | "country" | "birthYear">): Promise<string> {
  const id = randomBytes(24).toString("base64url");
  const now = Date.now();
  await consents().doc(id).set({ ...c, parentEmail: null, sends: 0, status: "pending", createdAt: now, expiresAt: now + CONSENT_DAYS * 86_400_000 } satisfies ConsentDoc);
  return id;
}

const valid = (id: string) => /^[A-Za-z0-9_-]{20,64}$/.test(id);

export async function getConsent(id: string): Promise<(ConsentDoc & { id: string; expired: boolean }) | null> {
  if (!valid(id)) return null;
  const d = await consents().doc(id).get();
  if (!d.exists) return null;
  const c = d.data() as ConsentDoc;
  const expired = c.expiresAt < Date.now();
  if (expired && c.status !== "approved") {
    // an expired request is removed the moment anyone looks at it
    await d.ref.delete();
    return null;
  }
  return { id, ...c, expired };
}

export async function recordSend(id: string, parentEmail: string) {
  await consents().doc(id).update({ parentEmail, sends: FieldValue.increment(1) });
}

export const maskEmail = (email: string) => {
  const [u, d] = email.split("@");
  return u && d ? `${u.slice(0, 2)}***@${d}` : "";
};

/**
 * The parent's answer. Approving creates the account (its email still has to be confirmed by a code on first sign-in);
 * either way the request stops holding the password hash. Two clicks at once cannot both act.
 */
export async function decideConsent(id: string, approve: boolean): Promise<ConsentStatus | null> {
  const ref = consents().doc(id);
  const taken = await fs().runTransaction(async (tx) => {
    const d = await tx.get(ref);
    const c = d.data() as ConsentDoc | undefined;
    if (!c || c.status !== "pending" || c.expiresAt < Date.now()) return null;
    tx.update(ref, { status: "deciding" });
    return c;
  });
  if (!taken) return null;

  let status: ConsentStatus = "declined";
  if (approve && taken.passwordHash) {
    const input: NewUser = {
      email: taken.email,
      firstName: taken.first,
      lastName: taken.last,
      passwordHash: taken.passwordHash,
      role: taken.role,
      country: taken.country,
      birthYear: taken.birthYear,
      status: "active",
      parentEmail: taken.parentEmail,
    };
    status = (await createUser(input)) ? "approved" : "failed";
  }
  await ref.update({ status, passwordHash: FieldValue.delete() });
  return status;
}
