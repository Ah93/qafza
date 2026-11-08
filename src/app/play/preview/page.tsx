import type { Metadata } from "next";
import { SelfPaced } from "@/components/student/play/SelfPaced";

export const metadata: Metadata = { title: "جرّب درسك كطالب — قفزة", description: "العب درسك كما سيراه طلابك قبل أن تشاركه معهم." };

export default function Page() {
  return <SelfPaced variant="preview" />;
}
