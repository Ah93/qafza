import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

/** Cairo Bold (open font, SIL OFL). Satori cannot read every Arabic font's tables; this one renders correctly. */
async function font() {
  const buf = await readFile(path.join(process.cwd(), "src/assets", "cairo-700.woff"));
  return [{ name: "Cairo", data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, weight: 700 as const }];
}

const bg = "linear-gradient(135deg, #7b26cc 0%, #c8238a 100%)";

/** square app icon; `maskable` keeps the letter inside the safe zone */
export async function iconImage(size: number, maskable: boolean) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: bg, color: "#fff", fontFamily: "Cairo", fontWeight: 700, fontSize: size * (maskable ? 0.46 : 0.58) }}>
        قفزة
      </div>
    ),
    { width: size, height: size, fonts: await font() },
  );
}

/** Satori mirrors the word order of right-to-left lines, so each word is its own box and the row runs right to left */
function Words({ text, size, opacity = 1, mb = 0 }: { text: string; size: number; opacity?: number; mb?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "row-reverse", flexWrap: "wrap", fontSize: size, opacity, marginBottom: mb, lineHeight: 1.4 }}>
      {text.split(/\s+/).filter(Boolean).map((w, i) => (
        <span key={i} style={{ display: "flex", marginLeft: size * 0.28 }}>
          {w}
        </span>
      ))}
    </div>
  );
}

/** 1200x630 share preview; `title` and `line` are Arabic */
export async function shareImage(title: string, line: string, badge?: string) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: bg, color: "#fff", fontFamily: "Cairo", fontWeight: 700, padding: 70 }}>
        <Words text="قفزة" size={56} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {badge && <Words text={badge} size={34} opacity={0.9} mb={18} />}
          <Words text={title} size={72} />
          <Words text={line} size={36} opacity={0.92} mb={0} />
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: await font() },
  );
}
