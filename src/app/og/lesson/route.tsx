import { shareImage } from "@/lib/brand-image";
import { loadLesson } from "@/lib/server/lessons";

/** share preview for a lesson link: its title and code, nothing about students */
export async function GET(req: Request) {
  const code = (new URL(req.url).searchParams.get("code") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const found = code ? await loadLesson("code", code).catch(() => null) : null;
  const res = found
    ? await shareImage(found.lesson.title.slice(0, 70), `ادخل بالرمز ${code} والعب الدرس`, "درس تفاعلي على قفزة")
    : await shareImage("من ملف عادي… إلى درس لا يُقاوَم", "ارفع درسك وتبنيه قفزة لعبةً يلعبها طلابك.");
  res.headers.set("Cache-Control", "public, max-age=300");
  return res;
}
