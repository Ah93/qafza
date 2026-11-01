import type { Metadata } from "next";
import Link from "next/link";
import { InfoGrid, LegalShell } from "@/components/legal/LegalShell";

export const metadata: Metadata = { title: "الخصوصية — قفزة" };

export default function PrivacyPage() {
  return (
    <LegalShell active="privacy" title="الخصوصية" intro="بلغة واضحة: ما نحفظه، وما لا نجمعه، وكيف تتحكّم في بياناتك.">
      <InfoGrid
        items={[
          {
            title: "ما نحفظه للمعلّم",
            tone: "violet",
            body: "الاسم والبريد، والملفات التي يرفعها، والدروس التي يبنيها، ونتائج طلابه.",
          },
          {
            title: "ما نحفظه للطالب",
            tone: "violet",
            body: "الاسم الأول، والتقدّم في الدروس، والنقاط والشارات. وبلا حساب، تبقى نتائجه عند معلّمه فقط.",
          },
          {
            title: "ما لا نجمعه أبدًا",
            tone: "rose",
            body: "الصور، والموقع، وجهات الاتصال. ولا إعلانات في قفزة.",
          },
          {
            title: "الأطفال دون 13",
            tone: "teal",
            body: "لا يُنشأ لهم حساب إلا بموافقة ولي الأمر بالبريد، وله أن يرى التقدّم ويحذف الحساب متى شاء.",
          },
          {
            title: "أين تُحفظ البيانات",
            tone: "violet",
            body: "للمدارس والمؤسسات خيار حفظ البيانات داخل المنطقة، من إعدادات الحساب.",
          },
          {
            title: "تحكّمك",
            tone: "violet",
            body: (
              <>
                تصدّر بياناتك أو تحذف حسابك من «
                <Link href="/account" className="font-bold text-violet underline underline-offset-2">
                  حسابي
                </Link>
                » في أي وقت.
              </>
            ),
          },
        ]}
      />
    </LegalShell>
  );
}
