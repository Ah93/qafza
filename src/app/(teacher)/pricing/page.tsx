import type { Metadata } from "next";
import { Suspense } from "react";
import { PricingView } from "@/components/teacher/pricing/PricingView";

export const metadata: Metadata = { title: "الاشتراك — قفزة", description: "خطط قفزة وأسعارها، ودرسك الأول مجانًا." };

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <PricingView />
    </Suspense>
  );
}
