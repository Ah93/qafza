import "server-only";
import { PLAN_DAYS, type Currency, type PlanId } from "../pricing";
import { fs } from "./firestore";
import { MailError, invoiceMail, sendMail } from "./mail";
import { getUser } from "./users";

/**
 * One invoice per payment, numbered in sequence per year. A Saudi VAT (15%) is shown for riyal prices, which already include it.
 * It is a "tax invoice" only when the company's name and tax number are set (INVOICE_COMPANY, INVOICE_VAT_NUMBER);
 * until then it is a plain receipt that says so, because a tax invoice without those would be wrong.
 */
export type Invoice = {
  id: string;
  number: string;
  issuedAt: number;
  plan: PlanId;
  currency: Currency;
  total: number;
  vatRate: number;
  vat: number;
  net: number;
  days: number;
  kind: "tax" | "receipt";
  seller: { name: string; vatNumber: string; address: string } | null;
  customer: { name: string; email: string };
};

const invoices = () => fs().collection("invoices");

const vatRate = () => {
  const n = Number(process.env.VAT_RATE);
  return Number.isFinite(n) && n >= 0 && n <= 30 ? n : 15;
};
const round2 = (n: number) => Math.round(n * 100) / 100;

export async function issueInvoice(uid: string, p: { plan: PlanId; currency: Currency; amount: number }): Promise<string> {
  const user = await getUser(uid);
  const now = Date.now();
  const year = new Date(now).getFullYear();
  const counter = fs().collection("counters").doc(`invoice-${year}`);
  const n = await fs().runTransaction(async (tx) => {
    const next = (((await tx.get(counter)).data() as { n?: number } | undefined)?.n ?? 0) + 1;
    tx.set(counter, { n: next });
    return next;
  });

  const rate = p.currency === "sar" ? vatRate() : 0;
  const vat = round2(p.amount - p.amount / (1 + rate / 100));
  const seller = process.env.INVOICE_COMPANY && process.env.INVOICE_VAT_NUMBER ? { name: process.env.INVOICE_COMPANY, vatNumber: process.env.INVOICE_VAT_NUMBER, address: process.env.INVOICE_ADDRESS ?? "" } : null;
  const doc: Omit<Invoice, "id"> = {
    number: `QZ-${year}-${String(n).padStart(6, "0")}`,
    issuedAt: now,
    plan: p.plan,
    currency: p.currency,
    total: p.amount,
    vatRate: rate,
    vat,
    net: round2(p.amount - vat),
    days: PLAN_DAYS[p.plan],
    kind: seller && rate > 0 ? "tax" : "receipt",
    seller,
    customer: { name: [user?.firstName, user?.lastName].filter(Boolean).join(" "), email: user?.email ?? "" },
  };
  const ref = await invoices().add({ ...doc, userId: uid });

  if (user?.email) {
    try {
      await sendMail(invoiceMail(user.email, user.firstName, { id: ref.id, ...doc }, process.env.APP_URL?.replace(/\/+$/, "")));
    } catch (e) {
      if (!(e instanceof MailError)) throw e; // the invoice exists either way; it can always be opened from the account page
    }
  }
  return ref.id;
}

export async function listInvoices(uid: string): Promise<Invoice[]> {
  const snap = await invoices().where("userId", "==", uid).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Invoice, "id">) })).sort((a, b) => b.issuedAt - a.issuedAt);
}

export async function getInvoice(uid: string, id: string): Promise<Invoice | null> {
  const d = await invoices().doc(id).get();
  const data = d.data() as (Omit<Invoice, "id"> & { userId: string }) | undefined;
  return data && data.userId === uid ? { id, ...data } : null;
}
