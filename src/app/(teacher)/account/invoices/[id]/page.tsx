import type { Metadata } from "next";
import { Suspense } from "react";
import { InvoiceView } from "@/components/teacher/account/InvoiceView";

export const metadata: Metadata = { title: "الفاتورة — قفزة", description: "فاتورة اشتراكك في قفزة، جاهزة للطباعة أو الحفظ بصيغة PDF." };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <InvoiceView />
    </Suspense>
  );
}
