import type { Metadata } from "next";

export const metadata: Metadata = { title: "خصّص درسك — قفزة", description: "اختر الفئة والمدة وأنماط العرض والتقييم قبل أن نبني درسك." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
