import type { Metadata } from "next";
import { Suspense } from "react";
import { LessonPage } from "@/components/teacher/lessons/LessonPage";

export const metadata: Metadata = { title: "صفحة الدرس — قفزة", description: "رمز الدرس ورابطه، ونتائجه، وخيارات تشغيله وتعديله." };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LessonPage />
    </Suspense>
  );
}
