import type { Metadata } from "next";
import { ClassesView } from "@/components/teacher/classes/ClassesView";

export const metadata: Metadata = { title: "صفوفي — قفزة", description: "طلاب كل صف ومجموعاتهم ومتوسط إتقانهم." };

export default function ClassesPage() {
  return <ClassesView />;
}
