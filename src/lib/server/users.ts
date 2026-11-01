import "server-only";
import { fs, keyId, newId } from "./firestore";

export type UserDoc = {
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: "teach" | "learn";
  country: string | null;
  birthYear: number;
  verified: boolean;
  /** "active", or "pending_consent" for a child whose parent has not answered yet */
  status: "active" | "pending_consent";
  parentEmail: string | null;
  createdAt: number;
  /** sessions issued before this moment are void (set when the password is reset) */
  sessionsFrom?: number;
};

const users = () => fs().collection("users");
/** one document per email address: its existence is what makes an email unique */
const emails = () => fs().collection("emails");

export type NewUser = Omit<UserDoc, "createdAt" | "verified" | "status" | "parentEmail" | "sessionsFrom"> & Partial<Pick<UserDoc, "status" | "parentEmail">>;

/** creates the account, or returns null when the email is taken (decided inside one transaction, so two sign-ups cannot both win) */
export async function createUser(input: NewUser): Promise<string | null> {
  const id = newId();
  const email = input.email.toLowerCase();
  const emailRef = emails().doc(keyId(email));
  const userRef = users().doc(id);
  try {
    await fs().runTransaction(async (tx) => {
      if ((await tx.get(emailRef)).exists) throw new Error("EMAIL_TAKEN");
      tx.set(emailRef, { uid: id });
      tx.set(userRef, { ...input, email, verified: false, status: input.status ?? "active", parentEmail: input.parentEmail ?? null, createdAt: Date.now() } satisfies UserDoc);
    });
    return id;
  } catch (e) {
    if (e instanceof Error && e.message === "EMAIL_TAKEN") return null;
    throw e;
  }
}

export async function getUser(id: string): Promise<(UserDoc & { id: string }) | null> {
  const d = await users().doc(id).get();
  return d.exists ? { id, ...(d.data() as UserDoc) } : null;
}

export async function getUserByEmail(email: string): Promise<(UserDoc & { id: string }) | null> {
  const e = await emails().doc(keyId(email.toLowerCase())).get();
  return e.exists ? getUser((e.data() as { uid: string }).uid) : null;
}

export const updateUser = (id: string, patch: Partial<UserDoc>) => users().doc(id).update(patch);
