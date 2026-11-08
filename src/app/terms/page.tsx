import type { Metadata } from "next";
import Link from "next/link";
import { InfoGrid, LegalShell } from "@/components/legal/LegalShell";

export const metadata: Metadata = { title: "الشروط — قفزة", description: "شروط استخدام منصة قفزة للمعلّمين والطلاب." };

export default function TermsPage() {
  return (
    <LegalShell active="terms" title="الشروط" intro="بلغة واضحة: ما تقدّمه قفزة، وما نتوقعه منك، وما يحدث عند الاشتراك أو الإلغاء.">
      <InfoGrid
        items={[
          {
            title: "استخدامك لقفزة",
            tone: "violet",
            body: "تحوّل ملفاتك إلى دروس تفاعلية وتشاركها مع طلابك. ما تبنيه يبقى لك، ونستخدمه فقط لتقديم الخدمة لك.",
          },
          {
            title: "المحتوى الذي ترفعه",
            tone: "violet",
            body: "ارفع ما تملك حق استخدامه. تُبنى كل محطة من صفحتها في ملفك، وما لا مصدر له لا يُولَّد.",
          },
          {
            title: "التجربة المجانية",
            tone: "teal",
            body: "درس واحد كامل بكل المزايا، مع حصته المباشرة وتقريره. بعده تشترك لتبني المزيد.",
          },
          {
            title: "الاشتراك والدفع",
            tone: "violet",
            body: "قفزة الكاملة بسعر واحد شهريًا أو للعام الدراسي، وتلغيه متى شئت. وطلابك يلعبون دروسك مجانًا دائمًا.",
          },
          {
            title: "الاستخدام المقبول",
            tone: "rose",
            body: "لا نقبل محتوى مسيئًا أو مخالفًا للنظام، ولا محاولة الوصول إلى بيانات غيرك. نحتفظ بحق إيقاف الحساب المخالف.",
          },
          {
            title: "الأطفال دون 13",
            tone: "teal",
            body: (
              <>
                لهم حساب بموافقة ولي الأمر فقط. التفاصيل في{" "}
                <Link href="/privacy" className="font-bold text-violet underline underline-offset-2">
                  الخصوصية
                </Link>
                .
              </>
            ),
          },
        ]}
      />
    </LegalShell>
  );
}
