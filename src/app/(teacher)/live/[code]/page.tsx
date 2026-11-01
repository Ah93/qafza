import type { Metadata } from "next";
import { Suspense } from "react";
import { LiveGate } from "@/components/teacher/live/LiveSession";

export const metadata: Metadata = { title: "حصة مباشرة — قفزة" };

export function generateStaticParams() {
  return [{ code: "7QK4" }];
}

export default function LivePage() {
  return (
    <Suspense fallback={null}>
      <LiveGate />
    </Suspense>
  );
}
