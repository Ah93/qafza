import "server-only";
import { randomInt } from "node:crypto";
import { alreadyExists, fs } from "./firestore";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I: codes are read off a board
const SHAPE = /^[A-HJ-NP-Z2-9]{4}$/;

const randomCode = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const codes = () => fs().collection("codes");

export type CodeKind = "lesson" | "class";

/**
 * Reserve a four-character code for a lesson or a class. Lessons and classes share one registry because both are typed
 * into the same "join" box, and a document id can only exist once, so two codes can never collide, even in a race.
 */
export async function claimCode(kind: CodeKind, id: string, wanted?: unknown): Promise<string> {
  const candidates = typeof wanted === "string" && SHAPE.test(wanted) ? [wanted] : [];
  for (let i = 0; i < 60; i++) {
    const code = candidates.shift() ?? randomCode();
    try {
      await codes().doc(code).create({ kind, id, createdAt: Date.now() });
      return code;
    } catch (e) {
      if (!alreadyExists(e)) throw e;
    }
  }
  throw new Error("no free code");
}

/** a code that is free right now, shown on a form before the class exists (claimed with claimCode when it is created) */
export async function peekCode(): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const code = randomCode();
    if (!(await codes().doc(code).get()).exists) return code;
  }
  throw new Error("no free code");
}

export async function lookupCode(code: string): Promise<{ kind: CodeKind; id: string } | null> {
  if (!SHAPE.test(code)) return null;
  const d = await codes().doc(code).get();
  return d.exists ? (d.data() as { kind: CodeKind; id: string }) : null;
}

export const releaseCode = (code: string) => codes().doc(code).delete();
