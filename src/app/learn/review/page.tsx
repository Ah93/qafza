import type { Metadata } from "next";
import { ReviewView } from "@/components/student/learn/ReviewView";

export const metadata: Metadata = { title: "تثبيت اليوم — قفزة" };

export default function Page() {
  return <ReviewView />;
}
