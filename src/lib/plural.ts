/**
 * Arabic count phrases, in one place, so no screen writes "1 أيام" or "2 دروس":
 * 0 → "0 أيام", 1 → "يوم واحد", 2 → "يومان", 3 to 10 → "3 أيام", 11 and over → "11 يومًا".
 */
type Forms = { one: string; two: string; few: string; many: string; zero?: string };

export function count(n: number, f: Forms): string {
  if (n === 0) return f.zero ?? `0 ${f.few}`;
  if (n === 1) return f.one;
  if (n === 2) return f.two;
  return n <= 10 ? `${n} ${f.few}` : `${n} ${f.many}`;
}

export const days = (n: number) => count(n, { one: "يوم واحد", two: "يومان", few: "أيام", many: "يومًا" });
export const students = (n: number) => count(n, { one: "طالب واحد", two: "طالبان", few: "طلاب", many: "طالبًا", zero: "لا طلاب" });
export const lessons = (n: number) => count(n, { one: "درس واحد", two: "درسان", few: "دروس", many: "درسًا" });
export const stations = (n: number) => count(n, { one: "محطة واحدة", two: "محطتان", few: "محطات", many: "محطة" });
export const badges = (n: number) => count(n, { one: "شارة واحدة", two: "شارتان", few: "شارات", many: "شارة" });
export const cards = (n: number) => count(n, { one: "بطاقة واحدة", two: "بطاقتان", few: "بطاقات", many: "بطاقة" });
export const minutes = (n: number) => count(n, { one: "دقيقة واحدة", two: "دقيقتان", few: "دقائق", many: "دقيقة" });
export const points = (n: number) => count(n, { one: "نقطة واحدة", two: "نقطتان", few: "نقاط", many: "نقطة" });
/** knowledge points: «نقطة معرفة» */
export const knowledgePoints = (n: number) => count(n, { one: "نقطة معرفة", two: "نقطتا معرفة", few: "نقاط معرفة", many: "نقطة معرفة" });
