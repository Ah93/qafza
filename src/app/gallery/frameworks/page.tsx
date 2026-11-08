import type { Metadata } from "next";
import { Gift, Map, Timer, Trophy, Users } from "lucide-react";
import { GalleryShell, ModeCard } from "@/components/gallery/GalleryShell";
import { PathDemo } from "@/components/gallery/DisplayDemos";
import { GroupsDemo, LeaderboardDemo, RaceDemo, SecretsDemo } from "@/components/gallery/FrameworkDemos";

export const metadata: Metadata = {
  title: "عوالم اللعب — قفزة",
  description: "خمسة عوالم لعب تُبقي الصف متحمّسًا: لوحة الصدارة والرتب، ورحلة على خريطة، وتحدّي المجموعات، وسباق مع الوقت، وصندوق الأسرار.",
};

export default function FrameworksGalleryPage() {
  return (
    <GalleryShell
      eyebrow="عوالم اللعب"
      title="خمسة عوالم لعب، جرّب كلًّا منها"
      intro="كلها تعمل في كل درس تبنيه قفزة، والمزيد قادم. اضغط وجرّب."
    >
      <ModeCard icon={<Trophy className="size-5" />} title="لوحة الصدارة والرتب" fits="التنافس الودّي في الصف" launch note="النقاط تقرّب الطالب من الرتبة التالية، ولوحة الصدارة تُظهر الخمسة الأوائل فقط، فلا يُحرَج من يتأخر.">
        <LeaderboardDemo />
      </ModeCard>
      <ModeCard icon={<Map className="size-5" />} title="رحلة على خريطة" fits="الدروس المتسلسلة" launch note="كل محطة نقطة على الخريطة، وآخرها الزعيم. يرى الطالب أين وصل وما بقي.">
        <PathDemo />
      </ModeCard>
      <ModeCard icon={<Users className="size-5" />} title="تحدّي المجموعات" fits="الحصة المباشرة" launch note="تتنافس المجموعات، وتُجمع نقاط أعضاء كل مجموعة، فيتعاون الطلاب داخل الفريق.">
        <GroupsDemo />
      </ModeCard>
      <ModeCard icon={<Timer className="size-5" />} title="سباق مع الوقت" fits="المراجعة السريعة" launch note="شريط وقت يتناقص، وكلما أجبت أسرع ربحت نقاطًا أكثر.">
        <RaceDemo />
      </ModeCard>
      <ModeCard icon={<Gift className="size-5" />} title="صندوق الأسرار" fits="المكافأة بعد الإنجاز" launch note="بعد ثلاث إجابات صحيحة يفتح الطالب صندوقًا فيه مكافأة: نقاط، أو قلب، أو بطاقة نادرة.">
        <SecretsDemo />
      </ModeCard>
    </GalleryShell>
  );
}
