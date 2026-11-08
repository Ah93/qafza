import type { Metadata } from "next";
import { ParentConsent } from "@/components/student/ParentConsent";

export const metadata: Metadata = { title: "موافقة ولي الأمر — قفزة", description: "حساب طالب دون 13 سنة: أدخل بريد ولي أمرك ليوافق على إنشاء حسابك." };

export default function Page() {
  return <ParentConsent />;
}
