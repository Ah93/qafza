import { fs, keyId } from "@/lib/server/firestore";
import { clientIp, fail, limited, readJson, text, tooMany } from "@/lib/server/http";
import { MailError, sendMail, waitlistMail } from "@/lib/server/mail";

const EMAIL = /^[^\s@/]+@[^\s@/]+\.[^\s@/]{2,}$/;
const STAGES = ["ابتدائي", "متوسط", "ثانوي", "جامعي", "تدريب", "أخرى"];
const COUNTRIES = ["السعودية", "قطر", "الإمارات", "الكويت", "مصر", "أخرى"];
const DEVICES = ["نعم", "لا", "بعضهم"];

/** the beta waitlist: one entry per email (asking twice changes nothing), saved, then a confirmation email */
export async function POST(req: Request) {
  if (limited(`waitlist:${clientIp(req)}`, 6, 60_000 * 10)) return tooMany();
  const b = await readJson(req);
  if (!b) return fail("طلب غير صالح.");

  const name = text(b.name, 60);
  const email = text(b.email, 120).toLowerCase();
  const subject = text(b.subject, 60);
  const stage = STAGES.includes(String(b.stage)) ? String(b.stage) : "";
  const country = COUNTRIES.includes(String(b.country)) ? String(b.country) : "";
  const devices = DEVICES.includes(String(b.devices)) ? String(b.devices) : "";
  if (!name) return fail("اكتب اسمك.");
  if (!EMAIL.test(email)) return fail("اكتب بريدك الإلكتروني كاملًا.");
  if (!stage || !country || !devices) return fail("أكمل المرحلة والدولة وهل لدى طلابك أجهزة.");

  const ref = fs().collection("waitlist").doc(keyId(email));
  const existing = await ref.get();
  if (!existing.exists) await ref.set({ name, email, subject, stage, country, devices, createdAt: Date.now() });

  // the confirmation is best effort: the entry is already saved, so a mail hiccup must not lose it
  let mailed = true;
  if (!existing.exists) {
    try {
      await sendMail(waitlistMail(email, name));
    } catch (e) {
      if (!(e instanceof MailError)) throw e;
      mailed = false;
    }
  }
  return Response.json({ ok: true, already: existing.exists, mailed });
}
