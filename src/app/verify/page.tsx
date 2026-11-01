import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { VerifyForm } from "@/components/auth/VerifyForm";

export const metadata: Metadata = { title: "تأكيد البريد — قفزة" };

export default function VerifyPage() {
  return (
    <>
      <header className="border-b border-violet/5 bg-white/80">
        <div className="mx-auto flex h-[52px] max-w-[1080px] items-center justify-between px-5">
          <Logo />
          <Link href="/signup" className="text-[11px] font-semibold text-violet underline underline-offset-4">
            العودة
          </Link>
        </div>
      </header>
      <main className="grid flex-1 place-items-center px-5 py-12">
        <VerifyForm />
      </main>
    </>
  );
}
