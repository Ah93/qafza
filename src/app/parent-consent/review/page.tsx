import type { Metadata } from "next";
import { Suspense } from "react";
import { ParentDecision } from "@/components/student/ParentDecision";

export const metadata: Metadata = { title: "طلب موافقة ولي الأمر — قفزة" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ParentDecision />
    </Suspense>
  );
}
