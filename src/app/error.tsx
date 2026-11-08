"use client";

import { useEffect } from "react";
import Link from "next/link";

/** any error on a page: a calm Arabic message instead of the framework's English one */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[qafza] page error:", error);
  }, [error]);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-[520px] flex-1 place-items-center px-5 py-10 text-center">
      <div role="alert">
        <p className="text-[64px] font-bold leading-none text-pink-card" aria-hidden>
          !
        </p>
        <h1 className="mt-3 text-3xl font-bold text-indigo-deep">حدث خطأ من جهتنا.</h1>
        <p className="mt-2 text-sm font-medium leading-7 text-indigo-deep/70">أعد المحاولة بعد لحظات. إن تكرّر الأمر فسنكون ممتنّين لو أخبرتنا.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="rounded-full bg-brand px-9 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30">
            أعد المحاولة
          </button>
          <Link href="/" className="rounded-full border border-violet/15 bg-white px-9 py-3 text-sm font-bold text-violet">
            عُد إلى الرئيسية
          </Link>
        </div>
      </div>
    </main>
  );
}
