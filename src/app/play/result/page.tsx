import type { Metadata } from "next";
import { ResultView } from "@/components/student/play/ResultView";

export const metadata: Metadata = { title: "نتيجتك — قفزة", description: "نقاطك وشاراتك وبطاقاتك بعد إنهاء الدرس." };

export default function Page() {
  return <ResultView />;
}
