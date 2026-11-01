/**
 * Signed session tokens ("<payload>.<signature>"), HMAC-SHA256 over Web Crypto so the same code
 * runs in route handlers and in the proxy. The payload is only a user id and an expiry:
 * everything else is looked up in the database.
 */

export const SESSION_COOKIE = "qafza_session";
export const SESSION_DAYS = 30;

const enc = new TextEncoder();

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to at least 32 characters");
  return s;
}

const b64 = {
  encode(bytes: Uint8Array) {
    let s = "";
    bytes.forEach((b) => (s += String.fromCharCode(b)));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  decode(text: string) {
    const s = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
  },
};

async function key() {
  return crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(uid: string): Promise<string> {
  const payload = b64.encode(enc.encode(JSON.stringify({ uid, iat: Date.now(), exp: Date.now() + SESSION_DAYS * 864e5 })));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(), enc.encode(payload)));
  return `${payload}.${b64.encode(sig)}`;
}

/** the user id inside a valid, unexpired token; otherwise null */
export async function readSession(token: string | undefined): Promise<string | null> {
  return (await readSessionToken(token))?.uid ?? null;
}

/** like readSession, plus when the token was issued (tokens from before a password reset are refused by the database check) */
export async function readSessionToken(token: string | undefined): Promise<{ uid: string; iat: number } | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(), b64.decode(sig) as BufferSource, enc.encode(payload));
    if (!ok) return null;
    const { uid, exp, iat } = JSON.parse(new TextDecoder().decode(b64.decode(payload))) as { uid?: string; exp?: number; iat?: number };
    return typeof uid === "string" && typeof exp === "number" && exp > Date.now() ? { uid, iat: typeof iat === "number" ? iat : 0 } : null;
  } catch {
    return null;
  }
}
