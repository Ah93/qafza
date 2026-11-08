import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 w-full max-w-[1080px] border-t border-violet/10 px-5 py-5">
      <div className="flex items-center justify-between text-xs text-indigo-deep/70">
        <span>© 2026 قفزة</span>
        <nav className="flex gap-4 font-medium text-violet underline underline-offset-4">
          <Link href="/privacy">الخصوصية</Link>
          <Link href="/terms">الشروط</Link>
          <Link href="/help">المساعدة</Link>
        </nav>
      </div>
    </footer>
  );
}
