import "server-only";

export const fail = (error: string, status = 400) => Response.json({ error }, { status });

/** the request's JSON body as a plain object, or null when it is missing or malformed */
export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const v = await req.json();
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const text = (v: unknown, max = 200): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

const hits = new Map<string, number[]>();

/** in-memory sliding window; good enough for one server process, swap for a shared store when scaling out */
export function limited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  return recent.length > max;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export const tooMany = () => fail("محاولات كثيرة. انتظر دقيقة ثم حاول مجددًا.", 429);
