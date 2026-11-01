import type { Metadata } from "next";
import { ProfileView } from "@/components/student/learn/ProfileView";

export const metadata: Metadata = { title: "سجلّي — قفزة" };

export default function Page() {
  return <ProfileView />;
}
