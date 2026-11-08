import type { Metadata } from "next";
import { NewClassView } from "@/components/teacher/classes/NewClassView";

export const metadata: Metadata = { title: "صف جديد — قفزة", description: "أنشئ صفًّا وأعطِ طلابك رمزه ليدخلوا." };

export default function NewClassPage() {
  return <NewClassView />;
}
