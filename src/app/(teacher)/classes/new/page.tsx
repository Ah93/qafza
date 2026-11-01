import type { Metadata } from "next";
import { NewClassView } from "@/components/teacher/classes/NewClassView";

export const metadata: Metadata = { title: "صف جديد — قفزة" };

export default function NewClassPage() {
  return <NewClassView />;
}
