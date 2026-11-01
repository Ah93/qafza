import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { deleteWhere, fs } from "./firestore";

/**
 * One-time links sent by email (password reset, a parent's approval). Only a hash of the token is stored,
 * so a copy of the database cannot be used to take over an account.
 */
export type TokenKind = "reset" | "consent";
type TokenDoc = { kind: TokenKind; expiresAt: number; userId: string | null; ref: string | null };

const tokens = () => fs().collection("tokens");
const idOf = (raw: string) => createHash("sha256").update(`${raw}:${process.env.AUTH_SECRET}`).digest("hex");

export async function issueToken(kind: TokenKind, opts: { ttlMs: number; userId?: string; ref?: string }): Promise<string> {
  const raw = randomBytes(24).toString("base64url");
  await tokens().doc(idOf(raw)).set({ kind, expiresAt: Date.now() + opts.ttlMs, userId: opts.userId ?? null, ref: opts.ref ?? null } satisfies TokenDoc);
  return raw;
}

/** the token's owner, or null when it is unknown, of another kind, or expired */
export async function readToken(kind: TokenKind, raw: string): Promise<{ userId: string | null; ref: string | null } | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(raw)) return null;
  const d = await tokens().doc(idOf(raw)).get();
  const t = d.data() as TokenDoc | undefined;
  if (!t || t.kind !== kind || t.expiresAt < Date.now()) return null;
  return { userId: t.userId, ref: t.ref };
}

export const consumeToken = (raw: string) => tokens().doc(idOf(raw)).delete();

/** every outstanding link of one account (after a password change, none may stay valid) */
export const revokeTokensOf = (userId: string) => deleteWhere("tokens", "userId", userId);
