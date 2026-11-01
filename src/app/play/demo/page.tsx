import type { Metadata } from "next";
import { SelfPaced } from "@/components/student/play/SelfPaced";

export const metadata: Metadata = { title: "العب الدرس — قفزة" };

export default function Page() {
  return <SelfPaced variant="demo" />;
}
