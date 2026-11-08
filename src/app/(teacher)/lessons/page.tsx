import type { Metadata } from "next";
import { LessonsView } from "@/components/teacher/lessons/LessonsView";

export const metadata: Metadata = { title: "دروسي — قفزة", description: "كل دروسك في مكان واحد: افتح، وعدّل، وشارك، وتابع نتائجها." };

export default function LessonsPage() {
  return <LessonsView />;
}
