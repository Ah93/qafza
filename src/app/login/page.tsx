import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthTabs, SocialButtons } from "@/components/auth/parts";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "تسجيل الدخول — قفزة" };

export default function LoginPage() {
  return (
    <AuthShell>
      <h1 className="text-4xl font-bold text-indigo-deep">أهلًا بعودتك</h1>
      <p className="mb-6 mt-2 text-xs text-indigo-deep/60">ادخل لتكمل دروسك وألعابك.</p>
      <AuthTabs active="login" />
      <div className="mt-5">
        <SocialButtons />
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
