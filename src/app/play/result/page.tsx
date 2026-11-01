import type { Metadata } from "next";
import { ResultView } from "@/components/student/play/ResultView";

export const metadata: Metadata = { title: "نتيجتك — قفزة" };

export default function Page() {
  return <ResultView />;
}
