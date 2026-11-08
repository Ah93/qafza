import "server-only";

export type Mail = { to: string; subject: string; html: string; text: string };

/** raised when a message could not be sent; `message` is safe to show to the user */
export class MailError extends Error {}

/** true once the Resend key and the verified sender are both set */
export const mailConfigured = () => !!process.env.RESEND_API_KEY && !!process.env.MAIL_FROM;

/**
 * Sign-ups are confirmed without an email when SKIP_EMAIL_VERIFICATION=1 (development only, ignored in production) or
 * ALLOW_UNVERIFIED_SIGNUPS=1 (works anywhere, for demo deployments before a mail provider is connected).
 * While either is on, nobody proves they own their email address: remove it before real users arrive.
 */
export const skipVerification = () => (process.env.SKIP_EMAIL_VERIFICATION === "1" && process.env.NODE_ENV !== "production") || process.env.ALLOW_UNVERIFIED_SIGNUPS === "1";

/** outside production, with no provider configured, codes and links are handed back to the page so the flow can be tried */
export const devHints = () => !mailConfigured() && process.env.NODE_ENV !== "production";

/**
 * Sends one email through Resend (https://resend.com/docs/api-reference/emails/send-email).
 * With no key configured the message is printed to the server console instead (never in production: there it fails loudly).
 * Returns true when the provider accepted it, false when it was only printed.
 */
export async function sendMail(m: Mail): Promise<boolean> {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.error("[qafza] RESEND_API_KEY / MAIL_FROM are not set: cannot send email");
      throw new MailError("خدمة البريد غير مهيّأة بعد. حاول لاحقًا أو تواصل معنا.");
    }
    console.log(`[qafza] (no mail provider) to ${m.to}: ${m.subject}\n${m.text}\n`);
    return false;
  }

  let res: Response;
  try {
    res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [m.to], subject: m.subject, html: m.html, text: m.text }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    console.error("[qafza] Resend request failed:", e);
    throw new MailError("تعذّر الاتصال بخدمة البريد. حاول بعد قليل.");
  }
  if (!res.ok) {
    console.error(`[qafza] Resend refused the message (${res.status}):`, (await res.text().catch(() => "")).slice(0, 400));
    throw new MailError("تعذّر إرسال الرسالة. تأكد من البريد وحاول مجددًا.");
  }
  return true;
}

/**
 * The public address of the site, for links inside emails. A link in an email must never be built from the request's
 * Host header in production (an attacker could point it at their own site), so there APP_URL is required.
 */
export function appOrigin(req: Request): string {
  const fixed = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (fixed) return fixed;
  if (process.env.NODE_ENV === "production") throw new MailError("عنوان الموقع غير مهيّأ (APP_URL).");
  return new URL(req.url).origin;
}

/* ---------- templates ---------- */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(title: string, body: string, cta?: { label: string; url: string }): string {
  return `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#f4f1fb;padding:24px 12px;font-family:Tahoma,Arial,sans-serif;color:#1b0f3d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:20px;padding:28px" cellpadding="0" cellspacing="0">
<tr><td style="font-size:22px;font-weight:bold;color:#6d28d9;padding-bottom:6px">قفزة</td></tr>
<tr><td style="font-size:20px;font-weight:bold;padding:8px 0 12px">${esc(title)}</td></tr>
<tr><td style="font-size:15px;line-height:1.9;color:#2d2255">${body}</td></tr>
${cta ? `<tr><td style="padding:22px 0 6px"><a href="${esc(cta.url)}" style="display:inline-block;background:#6d28d9;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 30px;border-radius:999px">${esc(cta.label)}</a></td></tr>
<tr><td style="font-size:12px;color:#6b6490;line-height:1.8;padding-top:10px">إن لم يعمل الزر، انسخ هذا الرابط إلى المتصفح:<br><span dir="ltr" style="word-break:break-all">${esc(cta.url)}</span></td></tr>` : ""}
<tr><td style="font-size:11px;color:#8a84a8;padding-top:22px;border-top:1px solid #eee9f8;margin-top:18px">وصلتك هذه الرسالة من قفزة. إن لم تكن أنت من طلبها فتجاهلها، ولن يتغيّر شيء.</td></tr>
</table></td></tr></table></body></html>`;
}

export function verificationMail(to: string, firstName: string, code: string): Mail {
  const html = layout(
    "رمز تأكيد بريدك",
    `أهلاً ${esc(firstName)}،<br>رمزك لتأكيد البريد:<div dir="ltr" style="font-size:34px;letter-spacing:8px;font-weight:bold;color:#6d28d9;margin:14px 0">${esc(code)}</div>صالح لمدة 15 دقيقة. لا تشاركه مع أحد.`,
  );
  return { to, subject: `رمز التأكيد ${code} — قفزة`, html, text: `أهلاً ${firstName}، رمز تأكيد بريدك في قفزة: ${code} (صالح 15 دقيقة).` };
}

export function resetMail(to: string, firstName: string, url: string): Mail {
  const html = layout("إعادة تعيين كلمة المرور", `أهلاً ${esc(firstName)}،<br>طلبنا منك أحدٌ إعادة تعيين كلمة مرور حسابك. اضغط الزر لاختيار كلمة جديدة. الرابط صالح لمدة ساعة ويعمل مرة واحدة.`, { label: "اختر كلمة مرور جديدة", url });
  return { to, subject: "إعادة تعيين كلمة المرور — قفزة", html, text: `أهلاً ${firstName}، لإعادة تعيين كلمة مرورك افتح الرابط (صالح ساعة، لمرة واحدة): ${url}` };
}

export function invoiceMail(to: string, firstName: string, inv: { id: string; number: string; total: number; vat: number; vatRate: number; currency: string; plan: string; kind: string }, origin?: string): Mail {
  const cur = inv.currency === "usd" ? "$" : inv.currency === "sar" ? "ر.س" : "ر.ق";
  const lines = [`الخطة: قفزة الكاملة (${inv.plan === "year" ? "العام الدراسي" : "شهري"})`, `الإجمالي: ${inv.total} ${cur}`, ...(inv.vatRate > 0 ? [`منها ضريبة القيمة المضافة (${inv.vatRate}%): ${inv.vat} ${cur}`] : [])];
  const url = origin ? `${origin}/account/invoices/${inv.id}` : undefined;
  const html = layout(`${inv.kind === "tax" ? "فاتورتك" : "إيصال دفعتك"} ${inv.number}`, `أهلًا ${esc(firstName)}،<br>شكرًا لاشتراكك في قفزة.<br><br>${lines.map(esc).join("<br>")}`, url ? { label: "افتح الفاتورة", url } : undefined);
  return { to, subject: `${inv.kind === "tax" ? "فاتورة" : "إيصال"} ${inv.number} — قفزة`, html, text: `${lines.join("\n")}${url ? `\nالفاتورة: ${url}` : ""}` };
}

export function waitlistMail(to: string, firstName: string): Mail {
  const html = layout("سجّلت في قائمة المعلّمين المئة", `أهلًا ${esc(firstName)}،<br>وصلنا تسجيلك، وشكرًا لاهتمامك بقفزة. نبحث عن 100 معلّم لاختبار المنصة معنا، من الابتدائي إلى الجامعة، وسنتواصل معك على هذا البريد حين يحين دورك.`);
  return { to, subject: "وصلنا تسجيلك — قفزة", html, text: `أهلًا ${firstName}، وصلنا تسجيلك في قائمة المعلّمين المئة في قفزة. سنتواصل معك على هذا البريد حين يحين دورك.` };
}

export function consentMail(to: string, child: string, url: string): Mail {
  const html = layout(
    `${child} يريد إنشاء حساب في قفزة`,
    `قفزة منصة تعليمية يلعب فيها الطلاب دروسهم مع معلّميهم. عمر ${esc(child)} أقل من 13 سنة، فلا يُنشأ حسابه إلا بموافقتك.<br><br>
<b>ما نحفظه:</b> الاسم الأول والبريد، والتقدّم في الدروس، والنقاط والشارات.<br>
<b>ما لا نجمعه أبدًا:</b> الصور، والموقع، وجهات الاتصال، والإعلانات.<br><br>
الطلب يبقى 7 أيام، وتستطيع حذف الحساب في أي وقت.`,
    { label: "اقرأ الطلب وقرّر", url },
  );
  return { to, subject: `${child} يطلب موافقتك على حسابه في قفزة`, html, text: `${child} (أقل من 13 سنة) يريد إنشاء حساب في قفزة ويحتاج موافقتك. افتح الرابط لتقرّر (صالح 7 أيام): ${url}` };
}
