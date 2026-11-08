import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/ForgotForm";

export const metadata: Metadata = { title: "نسيت كلمة المرور — قفزة", description: "اكتب بريدك لنرسل إليك رابطًا تختار منه كلمة مرور جديدة." };

export default function ForgotPage() {
  return (
    <AuthShell>
      <h1 className="text-4xl font-bold text-indigo-deep">نسيت كلمة المرور؟</h1>
      <p className="mt-2 text-xs text-indigo-deep/60">اكتب بريدك وسنرسل إليه رابطًا لاختيار كلمة جديدة.</p>
      <ForgotForm />
    </AuthShell>
  );
}
