"use client";

import Link from "next/link";
import { useFlow } from "./FlowProvider";

/** shown to a signed-in teacher whose email is not confirmed yet: building lessons needs it */
export function VerifyNotice() {
  const { account } = useFlow();
  if (!account || account.verified) return null;
  return (
    <p role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-xs font-semibold text-amber-900">
      أكّد بريدك الإلكتروني لتبدأ بناء الدروس.
      <Link href="/verify" className="rounded-full bg-amber-500 px-5 py-1.5 font-bold text-white">
        أدخل الرمز
      </Link>
    </p>
  );
}
