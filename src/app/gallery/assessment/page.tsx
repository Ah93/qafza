import type { Metadata } from "next";
import { CheckCheck, Layers, Shuffle, Target, TriangleAlert, Users, Volume2, Workflow, Zap } from "lucide-react";
import { GalleryShell, ModeCard } from "@/components/gallery/GalleryShell";
import {
  AudioQuestionDemo,
  DragDropDemo,
  ImageTapDemo,
  MatchDemo,
  McqDemo,
  QuickDemo,
  ScenarioDemo,
  SpotErrorDemo,
  TrueFalseDemo,
} from "@/components/gallery/AssessmentDemos";

export const metadata: Metadata = { title: "معرض أنماط التقييم — قفزة" };

export default function AssessmentGalleryPage() {
  return (
    <GalleryShell
      eyebrow="معرض أنماط التقييم"
      tone="pink"
      title="تسعة أنماط تقييم، تحدٍّ حيّ لكلٍّ منها"
      intro="أربعة منها عند الإطلاق. أجب عن كل تحدٍّ، وانظر كيف يُشرح الصواب والخطأ."
    >
      <ModeCard icon={<Layers className="size-5" />} title="اختيار من متعدد" fits="كل الدروس، وكشف الأخطاء الشائعة" launch note="أربعة خيارات، والخيارات الخاطئة مبنية على أخطاء حقيقية، وكل خطأ يُشرح.">
        <McqDemo />
      </ModeCard>
      <ModeCard icon={<CheckCheck className="size-5" />} title="صح أو خطأ" fits="المراجعة السريعة والحقائق" launch note="حكم سريع على عبارة واحدة. جيد لبداية الدرس أو نهايته.">
        <TrueFalseDemo />
      </ModeCard>
      <ModeCard icon={<Workflow className="size-5" />} title="سحب وإفلات" fits="التصنيف وربط العنصر بمكانه" launch note="يسحب الطالب كل بطاقة إلى خانتها، ويرى الصحيح والخطأ فورًا.">
        <DragDropDemo />
      </ModeCard>
      <ModeCard icon={<TriangleAlert className="size-5" />} title="اكتشف الخطأ" fits="التفكير الناقد والقراءة المتأنية" launch={false} note="فقرة فيها خطأ واحد مقصود، والطالب يجده ويعرف الصواب.">
        <SpotErrorDemo />
      </ModeCard>
      <ModeCard icon={<Volume2 className="size-5" />} title="سؤال صوتي" fits="اللغات والاستماع والنصوص المحفوظة" launch={false} note="يستمع الطالب ثم يجيب، فيتدرّب على الفهم السمعي.">
        <AudioQuestionDemo />
      </ModeCard>
      <ModeCard icon={<Shuffle className="size-5" />} title="مطابقة" fits="المصطلحات ومعانيها" launch note="يصل كل عنصر بوصفه. الخطأ يُظهر أي اختيار لم يتطابق.">
        <MatchDemo />
      </ModeCard>
      <ModeCard icon={<Target className="size-5" />} title="حدّد على الصورة" fits="الأجزاء والأماكن والخرائط" launch={false} note="يضغط الطالب الموضع الصحيح على الرسم نفسه.">
        <ImageTapDemo />
      </ModeCard>
      <ModeCard icon={<Users className="size-5" />} title="سيناريو" fits="التطبيق في مواقف حقيقية" launch={false} note="موقف من الحياة، والطالب يختار ما يفعل بحسب ما تعلّم.">
        <ScenarioDemo />
      </ModeCard>
      <ModeCard icon={<Zap className="size-5" />} title="أسئلة سريعة" fits="المسابقات وتحدّي الزعيم" launch={false} note="سلسلة عبارات بمؤقّت قصير، وخطأ واحد ينهي الجولة.">
        <QuickDemo />
      </ModeCard>
    </GalleryShell>
  );
}
