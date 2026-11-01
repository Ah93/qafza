import type { Metadata } from "next";
import { ClassesView } from "@/components/teacher/classes/ClassesView";

export const metadata: Metadata = { title: "صفوفي — قفزة" };

export default function ClassesPage() {
  return <ClassesView />;
}
