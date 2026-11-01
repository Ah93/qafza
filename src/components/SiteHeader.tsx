import Link from "next/link";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-violet/5 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-[52px] max-w-[1080px] items-center justify-between px-5">
        <Logo />
        <div className="flex items-center gap-4">
          <Link
            href="/join"
            className="hidden text-xs font-medium text-violet underline underline-offset-4 sm:block"
          >
            معك رمز لعبة؟
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-violet/10 bg-white px-4 py-1.5 text-xs font-semibold text-indigo-deep shadow-sm"
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-violet/30"
          >
            ابدأ مجانًا
          </Link>
        </div>
      </div>
    </header>
  );
}
