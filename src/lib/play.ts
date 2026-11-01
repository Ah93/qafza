/* The game rules, exactly as the "نظام اللعب" page defines them. */

export const POINTS = {
  first: 10, // correct on the first try
  second: 5, // correct on the second try
  streak: 20, // every 3 correct answers in a row
  surprise: 40, // the surprise box (also restores a heart)
  boss: 80, // beating the boss (also a rare card)
  review: 5, // each idea remembered in today's review
  engage: 2, // following along in a live lesson ("فهمت")
} as const;

export const MAX_HEARTS = 3;
/** engagement points are capped per station in a live lesson */
export const ENGAGE_CAP = 6;
export const STREAK_EVERY = 3;

export const RANKS = [
  { name: "مستكشف", from: 0 },
  { name: "باحث", from: 60 },
  { name: "عالِم", from: 120 },
  { name: "حكيم", from: 400 },
] as const;

export function rankIndex(points: number) {
  let i = 0;
  RANKS.forEach((r, k) => {
    if (points >= r.from) i = k;
  });
  return i;
}
export const rankOf = (points: number) => RANKS[rankIndex(points)];
export const nextRank = (points: number) => RANKS[rankIndex(points) + 1] ?? null;

/* ---------- badges (ten fixed ones) ---------- */

export type BadgeId =
  | "blazing"
  | "steady"
  | "flawless"
  | "boss"
  | "reviewer"
  | "support"
  | "spirit"
  | "explorer"
  | "collector"
  | "sage";

export const BADGES: { id: BadgeId; name: string; how: string; earned: string; color: string }[] = [
  { id: "blazing", name: "المتّقد", how: "شعلة 3 في درس", earned: "شعلة 3 في درس", color: "#f97316" },
  { id: "steady", name: "المثابر", how: "تثبيت 7 أيام متتالية", earned: "تثبيت 7 أيام متتالية", color: "#ea580c" },
  { id: "flawless", name: "بلا أخطاء", how: "درس كامل دون خطأ", earned: "درس كامل دون خطأ", color: "#10b981" },
  { id: "boss", name: "قاهر الزعيم", how: "هزمت الزعيم", earned: "هزمت التحدي الأخير", color: "#e11d6a" },
  { id: "reviewer", name: "المراجِع", how: "صحّحت خطأً في التثبيت", earned: "صحّحت خطأً في التثبيت", color: "#0f9f8f" },
  { id: "support", name: "سند المجموعة", how: "أعلى نقاط لمجموعتك", earned: "أعلى نقاط للصقور", color: "#0ea5e9" },
  { id: "spirit", name: "روح الفريق", how: "فازت مجموعتك", earned: "فازت مجموعتك", color: "#6366f1" },
  { id: "explorer", name: "المستكشف", how: "جرّبت 5 أنماط عرض", earned: "جرّبت 5 أنماط عرض", color: "#8b5cf6" },
  { id: "collector", name: "جامع البطاقات", how: "أكملت بطاقات درس", earned: "أكملت بطاقات درس", color: "#7b26cc" },
  { id: "sage", name: "الحكيم", how: "بلغت رتبة حكيم", earned: "بلغت رتبة حكيم", color: "#f472b6" },
];

export const badgeOf = (id: BadgeId) => BADGES.find((b) => b.id === id)!;

/* ---------- cards: one per station answered right first try, one rare for the boss ---------- */

export const CARDS = [
  { name: "كريّة حمراء", rare: false },
  { name: "هويّة الخلية", rare: false },
  { name: "رحلة الأكسجين", rare: false },
  { name: "الشكل المقعّر", rare: false },
  { name: "الهيموغلوبين", rare: false },
  { name: "بطل الأكسجين", rare: true },
] as const;

/* ---------- fixtures: the other players in the lesson ---------- */

export const PEERS = [
  { name: "سارة", initial: "س", color: "#0ea5e9", base: 100 },
  { name: "عمر", initial: "ع", color: "#10b981", base: 60 },
  { name: "نورة", initial: "ن", color: "#f59e0b", base: 40 },
] as const;

export const GROUP_BASE = [
  { name: "الصقور", color: "#ec4899", base: 270, mine: true },
  { name: "اللؤلؤ", color: "#0ea5e9", base: 300, mine: false },
  { name: "النخيل", color: "#10b981", base: 240, mine: false },
] as const;

export const PLAYER = { name: "يوسف", initial: "ي", color: "#ec4899" };

/** points of the profile fixture (the returning student on the home / profile screens) */
export const PROFILE_BASE = {
  points: 280,
  streak: 5,
  lessonsDone: 3,
  accuracy: 79,
  since: "12 أكتوبر 2026",
  classLabel: "ثاني متوسط (أ)",
  earned: ["blazing", "boss", "support"] as BadgeId[],
  cards: 3,
};
