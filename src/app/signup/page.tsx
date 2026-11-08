import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthTabs, SocialButtons } from "@/components/auth/parts";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "أنشئ حسابك — قفزة", description: "أنشئ حسابًا مجانيًا في قفزة، وابنِ درسك الأول في أقل من دقيقة." };

export default function SignupPage() {
  return (
    <AuthShell>
      <h1 className="text-4xl font-bold text-indigo-deep">أنشئ حسابك</h1>
      <p className="mb-6 mt-2 text-xs text-indigo-deep/60">دقيقة واحدة، ثم ترفع درسك الأول مجانًا.</p>
      <AuthTabs active="signup" />
      <div className="mt-5">
        <SocialButtons />
      </div>
      <SignupForm />
    </AuthShell>
  );
}
