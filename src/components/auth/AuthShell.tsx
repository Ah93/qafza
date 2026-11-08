import Link from "next/link";
import { Logo } from "../Logo";

const STATS = [
  { n: "6", label: "أنماط عرض" },
  { n: "5", label: "عوالم لعب" },
  { n: "4", label: "أنماط تقييم" },
];

function ShowcasePanel() {
  return (
    <aside className="dots relative hidden flex-col justify-between gap-10 overflow-hidden bg-gradient-to-b from-indigo-ink to-violet p-10 text-white lg:flex">
      <div>
        <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold">
          بديلك عن شرائح العرض
        </span>
        <h2 className="mt-5 text-[34px] font-bold leading-[1.3]">
          ارفع درسك،
          <br />
          ودع طلابك يلعبونه.
        </h2>
      </div>

      <div className="rounded-3xl border border-white/15 bg-white/5 p-3">
        <div className="relative grid h-40 place-items-center rounded-2xl bg-indigo-deep/60">
          <span className="absolute start-[22%] top-[22%] size-3.5 rounded-full bg-violet-300" />
          <span className="absolute bottom-[18%] end-[20%] size-4 rounded-full bg-pink-400" />
          <span className="grid size-14 place-items-center rounded-2xl bg-brand text-2xl shadow-lg">
            📖
          </span>
        </div>
        <div className="mt-3 rounded-2xl bg-white p-3.5 text-indigo-deep">
          <div className="text-sm font-bold">سؤال: أين تُصنع خلايا الدم الحمراء؟</div>
          <div className="mt-2.5 rounded-xl border border-mint bg-mint/10 px-3 py-2 text-xs font-semibold text-emerald-700">
            في نخاع العظم الأحمر ✓
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-rose-500">♥ ♥ ♥</span>
            <span className="text-amber-500">+10 نقاط · شعلة 3</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white/10 p-4">
            <div className="text-xl font-bold text-sun">{s.n}</div>
            <div className="mt-1 text-[11px] text-white/80">{s.label}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen flex-1 lg:grid-cols-2">
      <main className="flex flex-col px-6 py-6 sm:px-12">
        <div className="mx-auto flex w-full max-w-[460px] items-center justify-between">
          <Logo />
          <Link href="/" className="text-[11px] font-semibold text-violet underline underline-offset-4">
            العودة للرئيسية
          </Link>
        </div>
        <div className="mx-auto my-auto w-full max-w-[460px] py-8">{children}</div>
      </main>
      <ShowcasePanel />
    </div>
  );
}
