import type { Metadata } from "next";
import { Suspense } from "react";
import { JoinClient } from "./JoinClient";

export const metadata: Metadata = { title: "ادخل رمز اللعبة — قفزة", description: "اكتب الرمز الذي أعطاك إياه معلّمك لتدخل درسك أو حصتك وتبدأ اللعب." };

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinClient />
    </Suspense>
  );
}
