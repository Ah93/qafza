"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLessonByCode } from "@/components/useLessonByCode";
import { TeacherHeader } from "../TeacherHeader";
import { LiveHost } from "./LiveHost";

/** loads the lesson behind the code in the address, then runs the live session */
export function LiveGate() {
  const code = String(useParams<{ code: string }>().code ?? "").toUpperCase();
  const { lesson, loading, missing } = useLessonByCode(code);

  if (lesson) return <LiveHost key={code} lesson={lesson} code={code} />;
  return (
    <>
      <TeacherHeader />
      <main className="grid flex-1 place-items-center px-5 py-16 text-center">
        {loading ? (
          <p className="text-sm font-bold text-indigo-deep/70">جارٍ تحميل الدرس…</p>
        ) : (
          <div role="alert" className="max-w-sm">
            <h1 className="text-2xl font-bold text-indigo-deep">لم نجد هذا الدرس</h1>
            <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/70">{missing ? `لا درس منشورًا بالرمز ${code}. ربما حُذف أو أُرشف.` : ""}</p>
            <Link href="/lessons" className="mt-5 inline-block rounded-full bg-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30">
              إلى دروسي
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
