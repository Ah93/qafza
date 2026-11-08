import type { Metadata } from "next";
import { FunnelView } from "@/components/admin/FunnelView";

export const metadata: Metadata = { title: "مسار المعلّمين — قفزة", description: "من سجّل ومن بنى ومن شارك ومن عاد لدرس ثانٍ." };

export default function Page() {
  return <FunnelView />;
}
