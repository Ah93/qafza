import { fmtDate } from "./format";

/** "قبل يومين"-style label for a past moment; days are counted on the calendar, not in 24-hour blocks */
export function ago(then: number, now = Date.now()): string {
  const day = (t: number) => Math.floor((t - new Date(t).getTimezoneOffset() * 60_000) / 86_400_000);
  const d = Math.max(0, day(now) - day(then));
  if (d === 0) return "اليوم";
  if (d === 1) return "أمس";
  if (d === 2) return "قبل يومين";
  if (d <= 10) return `قبل ${d} أيام`;
  if (d < 14) return "قبل أسبوع";
  if (d < 30) {
    const w = Math.floor(d / 7);
    return w === 2 ? "قبل أسبوعين" : `قبل ${w} أسابيع`;
  }
  if (d < 60) return "قبل شهر";
  return fmtDate(then, { day: "numeric", month: "long", year: "numeric" });
}
