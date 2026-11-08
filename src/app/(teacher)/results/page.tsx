import type { Metadata } from "next";
import { Suspense } from "react";
import { ResultsView } from "@/components/teacher/results/ResultsView";

export const metadata: Metadata = { title: "النتائج — قفزة", description: "مستوى الإتقان وفجوات الفهم وأداء كل طالب." };

export default function ResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsView />
    </Suspense>
  );
}
