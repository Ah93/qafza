import { shareImage } from "@/lib/brand-image";

export const alt = "قفزة — من ملف عادي إلى درس لا يُقاوَم";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return shareImage("من ملف عادي… إلى درس لا يُقاوَم", "ارفع درسك وتبنيه قفزة لعبةً يلعبها طلابك في دقيقة.");
}
