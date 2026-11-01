import type { Metadata } from "next";
import { ParentConsent } from "@/components/student/ParentConsent";

export const metadata: Metadata = { title: "موافقة ولي الأمر — قفزة" };

export default function Page() {
  return <ParentConsent />;
}
