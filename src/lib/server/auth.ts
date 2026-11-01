import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_DAYS, readSessionToken, signSession } from "../session-token";
import { fs } from "./firestore";
import { MailError, devHints, sendMail, verificationMail } from "./mail";
import { getUser, updateUser } from "./users";

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: "teach" | "learn";
  verified: boolean;
};

/* ---------- passwords: scrypt, per-user salt ---------- */

const scrypt = (pw: string, salt: Buffer) =>
  new Promise<Buffer>((res, rej) => scryptCb(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? rej(e) : res(k))));

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${(await scrypt(pw, salt)).toString("hex")}`;
}

export async function checkPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, saltHex, hashHex] = stored.split("$");
  if (alg !== "scrypt" || !saltHex || !hashHex) return false;
  const want = Buffer.from(hashHex, "hex");
  const got = await scrypt(pw, Buffer.from(saltHex, "hex"));
  return want.length === got.length && timingSafeEqual(want, got);
}

/* ---------- sessions ---------- */

export async function startSession(uid: string) {
  (await cookies()).set(SESSION_COOKIE, await signSession(uid), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** the signed-in user, re-read from the database on every call (the cookie only carries an id) */
export async function currentUser(): Promise<User | null> {
  const session = await readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const u = await getUser(session.uid);
  // a child whose parent has not agreed yet has no working account
  if (!u || u.status !== "active") return null;
  // a password reset signs out every session that existed before it
  if (u.sessionsFrom && session.iat < u.sessionsFrom) return null;
  return { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, name: u.firstName, role: u.role, verified: u.verified };
}

export async function requireUser(): Promise<User | Response> {
  const u = await currentUser();
  return u ?? Response.json({ error: "سجّل الدخول أولًا." }, { status: 401 });
}

export const isResponse = (v: unknown): v is Response => v instanceof Response;

/* ---------- email verification codes ---------- */

const verifications = () => fs().collection("verifications");
const codeHash = (code: string, uid: string) => createHash("sha256").update(`${uid}:${code}:${process.env.AUTH_SECRET}`).digest("hex");

export async function issueVerificationCode(uid: string): Promise<string> {
  const code = String(Math.floor(100000 + (randomBytes(4).readUInt32BE() % 900000)));
  const now = Date.now();
  await verifications().doc(uid).set({ codeHash: codeHash(code, uid), expiresAt: now + 15 * 60_000, attempts: 0, sentAt: now });
  return code;
}

export type VerifyResult = "ok" | "wrong" | "expired" | "locked";

export async function checkVerificationCode(uid: string, code: string): Promise<VerifyResult> {
  const ref = verifications().doc(uid);
  // read, compare and count the try in one transaction, so parallel guesses cannot beat the 5-try limit
  const result = await fs().runTransaction(async (tx): Promise<VerifyResult> => {
    const d = await tx.get(ref);
    const v = d.data() as { codeHash: string; expiresAt: number; attempts: number } | undefined;
    if (!v || v.expiresAt < Date.now()) return "expired";
    if (v.attempts >= 5) return "locked";
    if (codeHash(code, uid) !== v.codeHash) {
      tx.update(ref, { attempts: v.attempts + 1 });
      return "wrong";
    }
    tx.delete(ref);
    return "ok";
  });
  if (result === "ok") await updateUser(uid, { verified: true });
  return result;
}

export async function secondsUntilResend(uid: string): Promise<number> {
  const d = await verifications().doc(uid).get();
  const sentAt = (d.data() as { sentAt?: number } | undefined)?.sentAt;
  return sentAt ? Math.max(0, Math.ceil((sentAt + 45_000 - Date.now()) / 1000)) : 0;
}

/**
 * Emails the verification code. With no mail provider configured the message is printed in the server console and,
 * outside production, the code is also handed back so the flow can be tried end to end.
 */
export async function deliverCode(email: string, firstName: string, code: string): Promise<{ devCode?: string; mailError?: string }> {
  try {
    await sendMail(verificationMail(email, firstName, code));
  } catch (e) {
    if (e instanceof MailError) return { mailError: e.message };
    throw e;
  }
  return devHints() ? { devCode: code } : {};
}
