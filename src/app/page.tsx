import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HeroDemo } from "@/components/landing/HeroDemo";

const STEPS = [
  { n: "١", title: "ارفع", body: "ملف PDF أو Word، أو رابط صفحة، أو نص", bg: "from-indigo-ink to-indigo-deep" },
  { n: "٢", title: "لعّب", body: "يُبنى أمامك في أقل من دقيقة", bg: "from-orchid to-violet" },
  { n: "٣", title: "شارك", body: "حصة مباشرة، أو تعلّم ذاتي", bg: "from-plum to-pink-card" },
];

const FEATURES = [
  {
    count: "6 متاحة الآن، و4 قادمة",
    title: "أنماط العرض",
    body: "كل فكرة تُعرض بالشكل الأنسب لها: رسم، أو خط زمني، أو بطاقات، أو حوار.",
    tone: "text-violet",
    chip: "bg-violet",
    href: "/gallery",
  },
  {
    count: "5 عوالم لعب، والمزيد قادم",
    title: "عوالم اللعب",
    body: "نقاط ورتب ومجموعات وتحدٍّ أخير، تُبقي الطالب متحمّسًا حتى النهاية.",
    tone: "text-pink-card",
    chip: "bg-pink-card",
    href: "/rules",
  },
  {
    count: "4 متاحة الآن، و5 قادمة",
    title: "أنماط التقييم",
    body: "تحدٍّ بعد كل محطة، وكل خطأ يُشرح فورًا.",
    tone: "text-teal-card",
    chip: "bg-teal-card",
    href: "/gallery/assessment",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1080px] flex-1 px-5">
        {/* hero */}
        <section className="grid items-center gap-10 py-10 lg:grid-cols-2">
          <div>
            <h1 className="text-5xl font-bold leading-[1.25] text-indigo-deep lg:text-[56px]">
              حوّل أي درس
              <br />
              <span className="bg-brand-text">إلى تجربة يلعبها</span>
              <br />
              <span className="bg-brand-text">طلابك.</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-8 text-indigo-deep/70">
              ارفع ملفك، وتحوّله قفزة في أقل من دقيقة إلى درس تفاعلي ملعوب. أي مادة، وبأي لغة.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="rounded-full bg-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30"
              >
                ابدأ بدرس مجاني
              </Link>
              <span className="text-[11px] text-indigo-deep/50">جرّب: بدّل نمط العرض في المثال</span>
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
                <div className="mt-1 text-[11px] text-white/80">{s.body}</div>
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
                <p className="mt-2 text-xs leading-6 text-indigo-deep/60">{f.body}</p>
                <Link href={f.href} className={`mt-4 inline-block text-xs font-semibold ${f.tone}`}>
                  جرّب الأمثلة
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* pricing */}
        <section className="mt-14">
          <h2 className="mb-4 text-2xl font-bold text-indigo-deep">سعر واحد يفتح كل شيء</h2>
          <div className="grid items-center gap-4 sm:grid-cols-3">
            <article className="rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-indigo-deep">التجربة المجانية</div>
              <div className="mt-1 text-3xl font-bold text-indigo-deep">مجانًا</div>
              <p className="mt-2 text-xs text-indigo-deep/60">درس كامل بكل المزايا، مع حصته وتقريره.</p>
              <Link
                href="/signup"
                className="mt-5 block rounded-full border border-violet/15 py-2.5 text-center text-xs font-bold text-violet"
              >
                ابدأ درسك المجاني
              </Link>
            </article>

            <article className="relative rounded-3xl bg-indigo-deep p-5 text-white shadow-xl shadow-indigo-deep/30 sm:-my-3 sm:py-8">
              <span className="absolute -top-3 end-5 rounded-full bg-sun px-3 py-1 text-[10px] font-bold text-indigo-deep">
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
              <p className="mt-2 text-xs text-indigo-deep/60">للمدارس والمعاهد والجامعات وأقسام التدريب.</p>
              <Link
                href="/pricing#contact"
                className="mt-5 block rounded-full border border-violet/15 py-2.5 text-center text-xs font-bold text-violet"
              >
                تواصل معنا
              </Link>
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
