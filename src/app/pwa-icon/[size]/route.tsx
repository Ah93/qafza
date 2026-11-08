import { iconImage } from "@/lib/brand-image";

const SIZES = [192, 512, 1024];

/** /pwa-icon/512, /pwa-icon/512-maskable ... generated PNGs for the manifest */
export async function GET(_req: Request, ctx: RouteContext<"/pwa-icon/[size]">) {
  const raw = (await ctx.params).size;
  const maskable = raw.endsWith("-maskable");
  const size = Number.parseInt(raw, 10);
  if (!SIZES.includes(size)) return new Response("not found", { status: 404 });
  const res = await iconImage(size, maskable);
  res.headers.set("Cache-Control", "public, max-age=604800, immutable");
  return res;
}
