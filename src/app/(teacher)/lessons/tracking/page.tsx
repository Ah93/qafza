import type { Metadata } from "next";
import { Suspense } from "react";
import { TrackingView } from "@/components/teacher/tracking/TrackingView";

export const metadata: Metadata = { title: "متابعة التعلّم الذاتي — قفزة", description: "من أنهى الدرس ومن تعثّر ومن لم يفتحه، ونتيجة كل تحدٍّ." };

export default function TrackingPage() {
  return (
    <Suspense fallback={null}>
      <TrackingView />
    </Suspense>
  );
}
