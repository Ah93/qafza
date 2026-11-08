import type { Metadata } from "next";
import { TeacherHeader } from "@/components/teacher/TeacherHeader";
import { VerifyNotice } from "@/components/teacher/VerifyNotice";
import { UploadCard } from "@/components/teacher/UploadCard";
import { MyLessonsPreview } from "@/components/teacher/MyLessonsPreview";

export const metadata: Metadata = { title: "لوحتي — قفزة", description: "ارفع ملفك وابنِ درسك التفاعلي، وتابع دروسك وصفوفك." };

export default function DashboardPage() {
  return (
    <>
      <TeacherHeader />
      <main className="mx-auto w-full max-w-[800px] flex-1 px-5 py-8">
        <VerifyNotice />
        <UploadCard />
        <MyLessonsPreview />
      </main>
    </>
  );
}
