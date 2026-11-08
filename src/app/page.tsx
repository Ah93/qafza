import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { BetaBar } from "@/components/landing/BetaBar";

const STEPS = [
  { n: "1", title: "ارفع", body: "ملفك كما هو، دون أي تجهيز: PDF أو Word أو رابط أو نص", bg: "from-indigo-ink to-indigo-deep" },
  { n: "2", title: "لعّب", body: "تبنيه قفزة: محطات وتحديات وزعيم في أقل من دقيقة، وأنت تراجع وتعتمد", bg: "from-orchid to-violet" },
  { n: "3", title: "شارك", body: "على السبورة، أو برابط لكل طالب", bg: "from-plum to-pink-card" },
];

const FEATURES = [
  {
    count: "6 متاحة الآن، و4 قادمة",
    title: "أنماط العرض",
    body: "لكل فكرة شكلها: تختار قفزة من 6 أنماط عرض ما يناسب كل فكرة، وتأتي 4 أخرى قريبًا.",
    tone: "text-violet",
    chip: "bg-violet",
    href: "/gallery",
  },
  {
    count: "5 عوالم لعب، والمزيد قادم",
    title: "عوالم اللعب",
    body: "نقاط ورتب ومجموعات تتنافس، وزعيم في الآخر. تُبقي الصف كله حاضرًا حتى النهاية.",
    tone: "text-pink-card",
    chip: "bg-pink-card",
    href: "/gallery/frameworks",
  },
  {
    count: "4 متاحة الآن، و5 قادمة",
    title: "أنماط التقييم",
    body: "كل خطأ فرصة فهم: تحدٍّ بعد كل محطة، وكل إجابة خاطئة تُشرح فورًا من درسك نفسه.",
    tone: "text-teal-card",
    chip: "bg-teal-card",
    href: "/gallery/assessment",
  },
];

export default function Home() {
  return (
    <>
      <aside aria-label="دعوة المعلّمين للتجربة">
        <BetaBar />
      </aside>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1080px] flex-1 px-5">
        {/* hero */}
        <section className="grid items-center gap-10 py-10 lg:grid-cols-2">
          <div>
            <h1 className="text-5xl font-bold leading-[1.25] text-indigo-deep lg:text-[56px]">
              من ملف عادي…
              <br />
              <span className="bg-brand-text">إلى درس</span>
              <br />
              <span className="bg-brand-text">لا يُقاوَم.</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-8 text-indigo-deep/70">
              ارفع درسك كما هو، وتبنيه قفزة في أقل من دقيقة: محطات تفاعلية، وتحدٍّ بعد كل فكرة، ومنافسة تُبقي الصف كله حاضرًا.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="rounded-full bg-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30"
              >
                ابنِ درسك مجانًا
              </Link>
              <Link href="/play/demo" className="rounded-full border border-violet/15 bg-white px-7 py-3 text-sm font-bold text-violet transition hover:border-violet/40">
                جرّب درسًا جاهزًا
              </Link>
            </div>
            <div className="mt-3">
              <span className="text-xs text-indigo-deep/70">جرّب بنفسك: الدرس نفسه بأربعة أشكال.</span>
            </div>
          </div>
          <HeroDemo />
        </section>

        {/* how it works */}
        <section className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className={`relative flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-l ${s.bg} px-5 py-4 text-white`}
            >
              <div>
                <div className="text-xl font-bold">{s.title}</div>
                <div className="mt-1 text-xs text-white/80">{s.body}</div>
              </div>
              <span className="text-4xl font-bold text-white/25">{s.n}</span>
            </div>
          ))}
        </section>

        {/* features */}
        <section className="mt-14">
          <h2 className="mb-4 text-2xl font-bold text-indigo-deep">في كل درس</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="rounded-3xl border border-violet/10 bg-white p-5 shadow-sm"
              >
                <span className={`mb-3 grid size-9 place-items-center rounded-xl ${f.chip}`}>
                  <span className="size-3.5 rounded-sm bg-white/90" />
                </span>
                <h3 className="text-lg font-bold text-indigo-deep">
                  {f.title}
                  <span className={`mt-1 block text-xs font-semibold ${f.tone}`}>{f.count}</span>
                </h3>
                <p className="mt-2 text-xs leading-6 text-indigo-deep/70">{f.body}</p>
                <Link href={f.href} className={`mt-4 inline-block text-xs font-semibold ${f.tone}`}>
                  جرّب الأمثلة
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* pricing */}
        <section className="mt-14">
          <h2 className="mb-4 text-2xl font-bold text-indigo-deep">ابدأ مجانًا، وادفع حين تقتنع.</h2>
          <div className="grid items-center gap-4 sm:grid-cols-3">
            <article className="rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-indigo-deep">التجربة المجانية</div>
              <div className="mt-1 text-3xl font-bold text-indigo-deep">مجانًا</div>
              <p className="mt-2 text-xs text-indigo-deep/70">درسك الأول علينا: كاملًا بكل مزاياه، مع حصته وتقريره.</p>
              <Link
                href="/signup"
                className="mt-5 block rounded-full border border-violet/15 py-2.5 text-center text-xs font-bold text-violet"
              >
                ابدأ درسك المجاني
              </Link>
            </article>

            <article className="relative rounded-3xl bg-indigo-deep p-5 text-white shadow-xl shadow-indigo-deep/30 sm:-my-3 sm:py-8">
              <span className="absolute -top-3 end-5 rounded-full bg-sun px-3 py-1 text-xs font-bold text-indigo-deep">
                الأكثر اختيارًا
              </span>
              <div className="text-sm font-semibold">قفزة الكاملة</div>
              <div className="mt-1 text-3xl font-bold">
                20$ <span className="text-base font-medium">شهريًا</span>
              </div>
              <p className="mt-2 text-xs text-white/70">دروس بلا حد، وطلابك يلعبون دروسك مجانًا دائمًا.</p>
              <Link
                href="/signup"
                className="mt-5 block rounded-full bg-white py-2.5 text-center text-xs font-bold text-indigo-deep"
              >
                ابدأ الآن
              </Link>
            </article>

            <article className="rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-indigo-deep">المؤسسات</div>
              <div className="mt-1 text-3xl font-bold text-indigo-deep">عرض خاص</div>
              <p className="mt-2 text-xs text-indigo-deep/70">لمدرستك أو جامعتك: عرض يناسب حجمكم واحتياجكم.</p>
              <Link
                href="/pricing#contact"
                className="mt-5 block rounded-full border border-violet/15 py-2.5 text-center text-xs font-bold text-violet"
              >
                تواصل معنا
              </Link>
            </article>
          </div>
        </section>

        {/* closing */}
        <section className="my-14 rounded-3xl bg-gradient-to-l from-indigo-deep to-[#4a1d96] px-6 py-8 text-center text-white shadow-xl shadow-indigo-deep/25">
          <p className="mx-auto max-w-xl text-lg font-bold leading-9">حصتك القادمة يمكن أن تكون أكثر حصة ينتظرها طلابك هذا الأسبوع.</p>
          <Link href="/signup" className="mt-5 inline-block rounded-full bg-white px-9 py-3 text-sm font-bold text-indigo-deep shadow-md transition hover:bg-white/90">
            ابنِ درسك الآن
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
