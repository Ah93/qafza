import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "الصفحة غير موجودة — قفزة", description: "لم نجد هذه الصفحة." };

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-[520px] flex-1 place-items-center px-5 py-10 text-center">
      <div>
        <div className="flex justify-center">
          <Logo />
        </div>
        <p className="mt-8 text-[64px] font-bold leading-none text-violet" aria-hidden>
          404
        </p>
        <h1 className="mt-3 text-3xl font-bold text-indigo-deep">لم نجد هذه الصفحة.</h1>
        <p className="mt-2 text-sm font-medium leading-7 text-indigo-deep/70">ربما تغيّر الرابط أو حُذفت الصفحة. تحقّق من العنوان، أو عُد إلى الرئيسية.</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-brand px-9 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30">
          عُد إلى الرئيسية
        </Link>
      </div>
    </main>
  );
}
