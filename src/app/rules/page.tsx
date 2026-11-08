import type { Metadata } from "next";
import { X } from "lucide-react";
import { GalleryHeader, PageTitle } from "@/components/gallery/GalleryShell";
import { BadgeShape } from "@/components/student/BadgeShape";
import { BADGES, RANKS } from "@/lib/play";

export const metadata: Metadata = { title: "كيف تحفّز قفزة طلابك — قفزة", description: "النقاط للحماس، والإتقان للتعلّم، ولا يختلطان: جدول النقاط والرتب والشارات وبقية عناصر اللعب." };

const POINTS: { label: string; value: string; tone: string }[] = [
  { label: "إجابة صحيحة من المحاولة الأولى", value: "+10", tone: "text-emerald-700" },
  { label: "إجابة صحيحة من المحاولة الثانية", value: "+5", tone: "text-emerald-700" },
  { label: "تفاعل مع المحطة في الحصة المباشرة", value: "+2، وحدّه 6 لكل محطة", tone: "text-emerald-700" },
  { label: "شعلة من 3 إجابات متتالية", value: "+20 وشارة «المتّقد»", tone: "text-orange-600" },
  { label: "صندوق المفاجأة", value: "+40 وقلب", tone: "text-amber-600" },
  { label: "هزيمة الزعيم", value: "+80 وبطاقة نادرة", tone: "text-pink-700" },
  { label: "نقاط يمنحها المعلّم في الحصة", value: "+5 أو +10", tone: "text-violet" },
  { label: "كل فكرة تتذكّرها في تثبيت اليوم", value: "+5", tone: "text-emerald-700" },
];

const RANK_TINT = ["#5eead4", "#a78bfa", "#fcd34d", "#f472b6"];

const BADGE_GROUP: Record<string, string> = {
  blazing: "استمرارية",
  steady: "استمرارية",
  flawless: "إتقان",
  boss: "إتقان",
  reviewer: "إتقان",
  support: "مجموعة",
  spirit: "مجموعة",
  explorer: "استكشاف",
  collector: "استكشاف",
  sage: "رتبة",
};

const BADGE_TEXT: Record<string, string> = {
  blazing: "شعلة 3 في درس",
  steady: "تثبيت 7 أيام متتالية",
  flawless: "درس كامل دون خطأ",
  boss: "هزيمة الزعيم",
  reviewer: "تصحيح خطأ سابق في التثبيت",
  support: "أعلى نقاط في مجموعته خلال حصة",
  spirit: "فوز مجموعته في حصة",
  explorer: "المرور بخمسة أنماط عرض",
  collector: "جمع بطاقات درس كاملة",
  sage: "بلوغ رتبة «حكيم»",
};

function Rule({ title, dot, children }: { title: string; dot: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2.5 text-xl font-bold text-indigo-deep">
        <span className="size-2.5 rounded-[3px]" style={{ background: dot }} />
        {title}
      </h2>
      <div className="mt-3 space-y-2.5 text-sm font-medium leading-7 text-indigo-deep/75">{children}</div>
    </section>
  );
}

export default function RulesPage() {
  return (
    <>
      <GalleryHeader />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 py-8">
        <PageTitle
          eyebrow="نظام اللعب"
          title="كيف تحفّز قفزة طلابك"
          intro="النقاط للحماس، والإتقان للتعلّم، ولا يختلطان."
        />

        <div className="mt-6 grid items-start gap-4 lg:grid-cols-[1.12fr_1fr]">
          <section className="rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="text-2xl font-bold text-indigo-deep">نقاط المعرفة</h2>
              <p className="text-xs font-medium text-indigo-deep/70">للتحفيز فقط، ولا تدخل في مستوى الإتقان</p>
            </div>
            <ul className="mt-3 divide-y divide-violet/10">
              {POINTS.map((p) => (
                <li key={p.label} className="flex items-center justify-between gap-4 py-3.5 text-sm">
                  <span className="font-semibold text-indigo-deep">{p.label}</span>
                  <span dir="rtl" className={`shrink-0 text-start font-bold ${p.tone}`}>
                    {p.value}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs font-medium text-indigo-deep/70">السرعة لا تمنح نقاطًا: الفهم وحده يمنحها.</p>
          </section>

          <section className="rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="text-2xl font-bold text-indigo-deep">الرتب</h2>
              <p className="text-xs font-medium text-indigo-deep/70">تُحسب من مجموع نقاط المعرفة عبر كل الدروس</p>
            </div>
            <ul className="mt-4 grid grid-cols-4 gap-2.5">
              {RANKS.map((r, i) => (
                <li key={r.name} className="rounded-2xl bg-violet/[0.04] px-2 py-4 text-center">
                  <span className="mx-auto block size-14 rotate-[8deg] rounded-[34%]" style={{ background: RANK_TINT[i] }} />
                  <p className="mt-3 text-base font-bold text-indigo-deep">{r.name}</p>
                  <p className="mt-0.5 text-xs font-medium text-indigo-deep/70">من {r.from} نقطة</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs font-medium leading-5 text-indigo-deep/70">عند بلوغ رتبة جديدة تظهر لحظة الترقية مع النقاط المطلوبة للرتبة التالية.</p>
          </section>
        </div>

        <div className="mt-4 grid items-start gap-4 md:grid-cols-3">
          <Rule title="الشعلة" dot="#f97316">
            <p>في الدرس: تزيد مع كل إجابة صحيحة متتالية، وتنطفئ عند الخطأ.</p>
            <p>اليومية: تزيد بكل يوم فيه تثبيت، وتنطفئ إن مرّ يوم بلا تثبيت.</p>
          </Rule>
          <Rule title="القلوب" dot="#e11d48">
            <p>ثلاثة قلوب في كل درس، والخطأ يُنقص قلبًا.</p>
            <p>عند نفادها لا يخرج الطالب: يراجع المحطة السابقة فيستعيد قلبًا.</p>
            <p>صندوق المفاجأة يعيد قلبًا.</p>
          </Rule>
          <Rule title="صندوق المفاجأة" dot="#d97706">
            <p>يظهر مرة في كل درس، بعد التحدي الثالث.</p>
            <p>فيه 40 نقطة وقلب.</p>
          </Rule>
          <Rule title="تحدّي الزعيم" dot="#ec4899">
            <p>4 عبارات صح أو خطأ في آخر الدرس.</p>
            <p>خطأ واحد ينهي الجولة، ويعيدها الطالب متى شاء.</p>
            <p>الفوز: 80 نقطة، وبطاقة نادرة، وشارة «قاهر الزعيم».</p>
          </Rule>
          <Rule title="البطاقات" dot="#7c3aed">
            <p>6 بطاقات في كل درس: بطاقة لكل محطة يُجاب تحدّيها صحيحًا من المحاولة الأولى، وبطاقة نادرة للزعيم.</p>
            <p>تُحفظ في «سجلّي»، ويراجع منها الطالب أفكار الدرس.</p>
          </Rule>
          <Rule title="السبورة فقط" dot="#1b0f3d">
            <p>لصف بلا أجهزة: المجموعات ترفع بطاقات الإجابة، والمعلّم يُدخلها.</p>
            <p>+10 للمجموعة على كل إجابة صحيحة، و+5 أو +10 للمشاركة الشفهية.</p>
            <p>الزعيم: +10 لكل عبارة صحيحة، و+20 للمجموعة التي تصيب الأربع.</p>
            <p>الإتقان تقديري من إجابات المجموعات. ولبيانات كل طالب: أرسل الدرس تعلّمًا ذاتيًا.</p>
          </Rule>
          <Rule title="المجموعات" dot="#0ea5e9">
            <p>يحدد المعلّم عددها (2 إلى 4)، وتوزّع قفزة الطلاب بالتناوب حسب الإتقان فتتقارب في العدد والمستوى.</p>
            <p>الطالب لا يختار مجموعته، ويجدها جاهزة. والضيف الجديد يُضاف إلى المجموعة الأقل عددًا.</p>
            <p>نقاط المجموعة مجموع نقاط أعضائها، وتُعدَّل بحسب الحجم إن زاد الفرق على طالب.</p>
          </Rule>
        </div>

        <section className="mt-4 rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h2 className="text-2xl font-bold text-indigo-deep">الشارات</h2>
            <p className="text-xs font-medium text-indigo-deep/70">عشر شارات ثابتة، تُمنح تلقائيًا عند تحقق شرطها مرة واحدة</p>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {BADGES.map((b) => (
              <li key={b.id} className="rounded-2xl bg-violet/[0.04] px-3 py-5 text-center">
                <span className="mx-auto block w-fit">
                  <BadgeShape color={b.color} size={46} />
                </span>
                <p className="mt-3 text-sm font-bold text-indigo-deep">{b.name}</p>
                <p className="mx-auto mt-1.5 w-fit rounded-full border border-violet/15 bg-white px-3 py-0.5 text-xs font-semibold text-indigo-deep/70">{BADGE_GROUP[b.id]}</p>
                <p className="mt-2 text-xs font-medium leading-5 text-indigo-deep/70">{BADGE_TEXT[b.id]}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-4 grid items-start gap-4 md:grid-cols-[1.25fr_1fr]">
          <section className="rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-bold text-indigo-deep">لوحة الصدارة</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-violet/[0.04] p-4">
                <h3 className="text-sm font-bold text-indigo-deep">فردي</h3>
                <p className="mt-1.5 text-xs font-medium leading-6 text-indigo-deep/70">
                  السبورة تعرض الخمسة الأوائل فقط، وكل طالب يرى ترتيبه على جهازه. ومن لا يريد ظهور اسمه يخفيه من «سجلّي».
                </p>
              </div>
              <div className="rounded-2xl bg-violet/[0.04] p-4">
                <h3 className="text-sm font-bold text-indigo-deep">مجموعات</h3>
                <p className="mt-1.5 text-xs font-medium leading-6 text-indigo-deep/70">تعرض السبورة ترتيب المجموعات كلها، ولا تعرض ترتيب الأفراد داخلها.</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-violet/10 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-bold text-indigo-deep">ما لا نفعله</h2>
            <ul className="mt-3 space-y-3">
              {[
                "لا نقاط تُشترى، ولا صناديق تُفتح بمال.",
                "لا نُظهر أسماء آخر الترتيب أمام الصف.",
                "لا نعاقب على البطء، ولا نمنح نقاطًا للسرعة.",
                "النقاط لا تدخل في مستوى الإتقان ولا في تقرير المعلّم.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm font-medium leading-6 text-indigo-deep/80">
                  <X className="mt-1 size-3.5 shrink-0 text-rose-500" strokeWidth={3.5} />
                  {t}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
