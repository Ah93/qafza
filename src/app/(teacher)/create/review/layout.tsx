import type { Metadata } from "next";

export const metadata: Metadata = { title: "راجع الدرس — قفزة", description: "راجع محطات درسك وتحدياته وعدّلها قبل أن تشاركه." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
