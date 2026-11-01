export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: string };

const NETWORK = "تعذّر الاتصال بالخادم. تأكد من الإنترنت وحاول مجددًا.";

async function parse<T>(res: Response): Promise<ApiResult<T>> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* an empty or non-JSON body */
  }
  if (res.ok) return { ok: true, status: res.status, data: body as T };
  const error = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "حدث خطأ. حاول مرة أخرى.";
  return { ok: false, status: res.status, error };
}

export const PAYWALL_EVENT = "qafza:paywall";

/** pages that are meant to be used signed out: a 401 there is not a reason to send the visitor to the login page */
const PUBLIC_PAGES = ["/login", "/signup", "/forgot", "/reset", "/verify", "/parent-consent"];

export async function api<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, { credentials: "same-origin", ...init });
    // a signed-out session on a page that needs one: go to the login page once
    if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth/") && !PUBLIC_PAGES.some((p) => window.location.pathname.startsWith(p))) {
      // a full reload on purpose: it also clears every piece of in-memory state that belonged to the old session
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    // 402: the free lesson is used up; one dialog (PaywallHost) explains it wherever the request came from
    if (res.status === 402 && typeof window !== "undefined") window.dispatchEvent(new Event(PAYWALL_EVENT));
    return await parse<T>(res);
  } catch {
    return { ok: false, status: 0, error: NETWORK };
  }
}

export const postJson = <T = Record<string, unknown>>(path: string, body: unknown, method = "POST") =>
  api<T>(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
