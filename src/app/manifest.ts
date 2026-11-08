import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "قفزة — دروس تفاعلية",
    short_name: "قفزة",
    description: "حوّل درسك إلى لعبة يلعبها طلابك.",
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f2ff",
    theme_color: "#7b26cc",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/1024", sizes: "1024x1024", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
