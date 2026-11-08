import Link from "next/link";
import { Logo } from "../Logo";

const TABS = [
  { id: "privacy", href: "/privacy", label: "الخصوصية" },
  { id: "terms", href: "/terms", label: "الشروط" },
  { id: "help", href: "/help", label: "المساعدة" },
] as const;

export type LegalTab = (typeof TABS)[number]["id"];

export function LegalShell({
  active,
  title,
  intro,
  draft = true,
  children,
}: {
  active: LegalTab;
  title: string;
  intro: string;
  draft?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-violet/5 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-[56px] max-w-[1080px] items-center justify-between px-5">
          <Logo />
          <Link
            href="/signup"
            className="rounded-full bg-brand px-5 py-2 text-xs font-bold text-white shadow-md shadow-violet/30"
          >
            ابدأ مجانًا
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[800px] flex-1 px-5 py-9">
        <h1 className="text-[40px] font-bold leading-tight text-indigo-deep">{title}</h1>

        <nav aria-label="الصفحات القانونية" className="mt-4 inline-flex rounded-full border border-violet/10 bg-white p-1 shadow-sm">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              aria-current={active === t.id ? "page" : undefined}
              className={`rounded-full px-5 py-2 text-xs font-bold transition ${
                active === t.id ? "bg-indigo-deep text-white" : "text-indigo-deep/70 hover:text-indigo-deep"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {draft && (
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-xs font-bold leading-6 text-amber-800">
            مسودة للتصميم: النص النهائي يُراجَع قانونيًا قبل الإطلاق، وفق نظام حماية البيانات الشخصية في السعودية وقانون حماية البيانات في قطر.
          </p>
        )}

        <p className="mt-5 text-sm font-medium text-indigo-deep/70">{intro}</p>

        <div className="mt-4">{children}</div>
      </main>

      <footer className="mx-auto w-full max-w-[800px] px-5 pb-8 text-xs text-indigo-deep/70">© 2026 قفزة</footer>
    </>
  );
}

export type Tone = "violet" | "teal" | "rose";

const TONE: Record<Tone, string> = {
  violet: "text-violet",
  teal: "text-teal-card",
  rose: "text-[#c0174f]",
};

export function InfoGrid({ items }: { items: { title: string; body: React.ReactNode; tone: Tone }[] }) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2">
      {items.map((it) => (
        <section key={it.title} className="rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
          <h2 className={`text-lg font-bold ${TONE[it.tone]}`}>{it.title}</h2>
          <p className="mt-2 text-sm font-medium leading-7 text-indigo-deep/75">{it.body}</p>
        </section>
      ))}
    </div>
  );
}
