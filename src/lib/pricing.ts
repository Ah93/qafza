/** prices and plans: one table, read by the pricing page and by the server (the server never trusts an amount from the browser) */

export type Currency = "usd" | "sar" | "qar";
export type PlanId = "monthly" | "year";
export type PayMethod = "mada" | "apple" | "stc" | "card";

export const FREE_LESSONS = 1;

export const CURRENCIES: { id: Currency; label: string }[] = [
  { id: "usd", label: "دولار" },
  { id: "sar", label: "ريال سعودي" },
  { id: "qar", label: "ريال قطري" },
];

/** major units; the year plan covers the school year */
export const PRICES: Record<Currency, Record<PlanId, number>> = {
  usd: { monthly: 20, year: 180 },
  sar: { monthly: 75, year: 675 },
  qar: { monthly: 73, year: 655 },
};

export const PLAN_DAYS: Record<PlanId, number> = { monthly: 30, year: 365 };

export const METHODS: { id: PayMethod; label: string; window: string }[] = [
  { id: "mada", label: "مدى", window: "مدى" },
  { id: "apple", label: "Apple Pay", window: "Apple Pay" },
  { id: "stc", label: "STC Pay", window: "STC Pay" },
  { id: "card", label: "بطاقات ائتمانية", window: "البطاقة" },
];

/** mada and STC Pay are Saudi methods: they are only offered for riyals */
export const methodsFor = (c: Currency): PayMethod[] => (c === "sar" ? ["mada", "apple", "stc", "card"] : ["apple", "card"]);

export const money = (c: Currency, n: number) => (c === "usd" ? `${n}$` : c === "sar" ? `${n} ر.س` : `${n} ر.ق`);

export const isCurrency = (v: unknown): v is Currency => v === "usd" || v === "sar" || v === "qar";
export const isPlan = (v: unknown): v is PlanId => v === "monthly" || v === "year";
export const isMethod = (v: unknown): v is PayMethod => v === "mada" || v === "apple" || v === "stc" || v === "card";

/** what the browser learns about the account's plan (GET /api/billing/status) */
export type PlanStatus = {
  entitled: boolean;
  plan: PlanId | null;
  /** when the paid period ends (ms), while entitled */
  until: number | null;
  lessonsCreated: number;
  freeLimit: number;
  /** may this account start another lesson right now? */
  canCreate: boolean;
  /** is a payment provider connected? false means the pay button cannot work yet */
  payments: "live" | "test" | "off";
};
