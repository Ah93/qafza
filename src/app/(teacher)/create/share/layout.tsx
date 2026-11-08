import type { Metadata } from "next";

export const metadata: Metadata = { title: "شارك الدرس — قفزة", description: "اختر كيف يلعب طلابك درسك: حصة مباشرة أو تعلّم ذاتي، ثم شاركهم الرمز." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
