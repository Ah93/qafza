import type { Metadata } from "next";
import { Suspense } from "react";
import { ParentDecision } from "@/components/student/ParentDecision";

export const metadata: Metadata = { title: "طلب موافقة ولي الأمر — قفزة", description: "اقرأ طلب طفلك لإنشاء حساب في قفزة، ثم وافق أو ارفض." };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ParentDecision />
    </Suspense>
  );
}
