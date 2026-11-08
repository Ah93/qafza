import type { Metadata } from "next";

export const metadata: Metadata = { title: "ابنِ درسك — قفزة", description: "نقرأ مصدرك ونبني درسك التفاعلي في أقل من دقيقة." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
