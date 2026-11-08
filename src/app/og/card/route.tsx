import { shareImage } from "@/lib/brand-image";

const num = (v: string | null, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));

/** a student's achievement card: lesson title, points, accuracy, rank. No name, so nothing personal is in the picture. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const title = (q.get("title") ?? "").slice(0, 60);
  const rank = (q.get("rank") ?? "").slice(0, 20);
  const line = `${num(q.get("points"), 100000)} نقطة معرفة · دقّة ${num(q.get("acc"), 100)}%${rank ? ` · رتبة ${rank}` : ""}`;
  const res = await shareImage(title ? `أنهيت درس ${title}` : "أنهيت درسًا في قفزة", line, "بطاقة إنجاز");
  res.headers.set("Cache-Control", "public, max-age=3600");
  return res;
}
