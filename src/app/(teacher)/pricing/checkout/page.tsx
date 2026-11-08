import type { Metadata } from "next";
import { Suspense } from "react";
import { TestCheckout } from "@/components/teacher/pricing/TestCheckout";

export const metadata: Metadata = { title: "الدفع — قفزة", description: "أكمل دفع اشتراكك في قفزة." };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TestCheckout />
    </Suspense>
  );
}
