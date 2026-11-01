import type { Metadata } from "next";
import { LearnHome } from "@/components/student/learn/LearnHome";

export const metadata: Metadata = { title: "مساحتي — قفزة" };

export default function Page() {
  return <LearnHome />;
}
