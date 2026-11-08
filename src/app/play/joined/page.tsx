import type { Metadata } from "next";
import { SelfPaced } from "@/components/student/play/SelfPaced";

export const metadata: Metadata = { title: "العب الدرس — قفزة", description: "تعلّم الدرس محطة بعد محطة، وأجب عن التحديات، واجمع النقاط." };

export default function Page() {
  return <SelfPaced variant="joined" />;
}
