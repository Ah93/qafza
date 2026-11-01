import type { Metadata } from "next";
import { AudioLines, ChartColumn, CircleDot, Copy, Ellipsis, MessagesSquare, Presentation, Route, SlidersHorizontal, SquarePlay } from "lucide-react";
import { GalleryShell, ModeCard } from "@/components/gallery/GalleryShell";
import {
  AudioDemo,
  CardsDemo,
  DialogueDemo,
  DiagramDemo,
  InfographicDemo,
  PathDemo,
  SimulationDemo,
  SlidesDemo,
  TimelineDemo,
  VideoDemo,
} from "@/components/gallery/DisplayDemos";

export const metadata: Metadata = { title: "معرض أنماط العرض — قفزة" };

export default function DisplayGalleryPage() {
  return (
    <GalleryShell
      eyebrow="معرض أنماط العرض"
      title="عشرة أنماط عرض، مثال حيّ لكلٍّ منها"
      intro="كلها من درس «خلايا الدم الحمراء». ستة منها عند الإطلاق، والبقية في المرحلة التالية. جرّب كل مثال بنفسك."
    >
      <ModeCard icon={<CircleDot className="size-5" />} title="رسم تفاعلي" fits="ما له أجزاء: خريطة، جهاز، خلية" launch note="يضغط الطالب أي جزء من الرسم فيقرأ عنه. هنا: أجزاء خلية الدم الحمراء.">
        <DiagramDemo />
      </ModeCard>
      <ModeCard icon={<Presentation className="size-5" />} title="شرائح تفاعلية" fits="تقسيم فكرة إلى نقاط متتابعة" launch note="تُكشف النقاط واحدة واحدة، فلا يُغرق الطالب بكل شيء مرة واحدة.">
        <SlidesDemo />
      </ModeCard>
      <ModeCard icon={<SquarePlay className="size-5" />} title="فيديو" fits="الشرح الحيّ والظواهر المتحركة" launch={false} note="فصول قصيرة يقفز بينها الطالب، مع نص مفرّغ يظهر أثناء التشغيل.">
        <VideoDemo />
      </ModeCard>
      <ModeCard icon={<Copy className="size-5" />} title="بطاقات" fits="المصطلحات والحفظ" launch note="وجه للمصطلح ووجه لمعناه، ويقلبها الطالب حتى يحفظها.">
        <CardsDemo />
      </ModeCard>
      <ModeCard icon={<Route className="size-5" />} title="مسار المهمة" fits="الدروس المتسلسلة" launch={false} note="الدرس محطات على مسار، كل محطة فكرة، ويرى الطالب أين وصل.">
        <PathDemo />
      </ModeCard>
      <ModeCard icon={<SlidersHorizontal className="size-5" />} title="محاكاة" fits="الأسباب والنتائج" launch={false} note="يغيّر الطالب شيئًا فيرى أثره فورًا. هنا: الهيموغلوبين والأكسجين الواصل.">
        <SimulationDemo />
      </ModeCard>
      <ModeCard icon={<AudioLines className="size-5" />} title="صوت" fits="النصوص والاستماع والمراجعة أثناء التنقّل" launch={false} note="شرح مسموع، ويضيء السطر الذي يُقرأ الآن.">
        <AudioDemo />
      </ModeCard>
      <ModeCard icon={<ChartColumn className="size-5" />} title="إنفوجرافيك" fits="المقارنات والتصنيفات" launch note="كل المعلومات في لوحة واحدة، ويضغط الطالب أي جزء ليتعمّق.">
        <InfographicDemo />
      </ModeCard>
      <ModeCard icon={<Ellipsis className="size-5" />} title="خط زمني" fits="المراحل والأحداث المرتّبة" launch note="محطات بالترتيب، ويضغط الطالب أي محطة ليرى تفاصيلها.">
        <TimelineDemo />
      </ModeCard>
      <ModeCard icon={<MessagesSquare className="size-5" />} title="حوار" fits="المفاهيم الصعبة والأسئلة الشائعة" launch note="الفكرة تُشرح كحوار بين طالب ومرشد، سطرًا بعد سطر.">
        <DialogueDemo />
      </ModeCard>
    </GalleryShell>
  );
}
