import type { Metadata } from "next";
import { SelfPaced } from "@/components/student/play/SelfPaced";

export const metadata: Metadata = { title: "جرّب درسًا جاهزًا — قفزة", description: "العب درسًا جاهزًا كما يلعبه طلابك: محطات وتحديات وزعيم." };

export default function Page() {
  return <SelfPaced variant="demo" />;
}
