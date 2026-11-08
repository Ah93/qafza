import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/ResetForm";

export const metadata: Metadata = { title: "كلمة مرور جديدة — قفزة", description: "اختر كلمة مرور جديدة لحسابك في قفزة." };

export default function ResetPage() {
  return (
    <AuthShell>
      <h1 className="text-4xl font-bold text-indigo-deep">كلمة مرور جديدة</h1>
      <p className="mt-2 text-xs text-indigo-deep/70">اختر كلمة لم تستخدمها في مكان آخر.</p>
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
