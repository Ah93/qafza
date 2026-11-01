import type { Metadata } from "next";
import { LessonsView } from "@/components/teacher/lessons/LessonsView";

export const metadata: Metadata = { title: "دروسي — قفزة" };

export default function LessonsPage() {
  return <LessonsView />;
}
