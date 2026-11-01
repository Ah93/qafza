import type { Metadata } from "next";
import { LiveStudent } from "@/components/student/play/LiveStudent";

export const metadata: Metadata = { title: "في الحصة — قفزة" };

export default function Page() {
  return <LiveStudent />;
}
