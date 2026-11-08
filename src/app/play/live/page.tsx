import type { Metadata } from "next";
import { LiveStudent } from "@/components/student/play/LiveStudent";

export const metadata: Metadata = { title: "في الحصة — قفزة", description: "شاشتك تتبع معلّمك في الحصة المباشرة: اقرأ، وأجب، وتنافس." };

export default function Page() {
  return <LiveStudent />;
}
