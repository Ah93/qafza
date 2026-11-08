import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { JoinClient } from "./JoinClient";

const base: Metadata = { title: "ادخل رمز اللعبة — قفزة", description: "اكتب الرمز الذي أعطاك إياه معلّمك لتدخل درسك أو حصتك وتبدأ اللعب." };

export async function generateMetadata({ searchParams }: PageProps<"/join">): Promise<Metadata> {
  const code = String((await searchParams).code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const image = code ? `/og/lesson?code=${code}` : "/opengraph-image";
  return {
    ...base,
    openGraph: { title: "العب هذا الدرس على قفزة", description: "درس تفاعلي، ادخل بالرمز وابدأ اللعب.", images: [{ url: image, width: 1200, height: 630 }], locale: "ar_SA" },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

/** the page reads the code from the link, so it is rendered per request (the share preview is built from it) */
async function PerRequest() {
  await connection();
  return null;
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <PerRequest />
      <JoinClient />
    </Suspense>
  );
}
