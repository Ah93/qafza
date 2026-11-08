"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlayHeader } from "../StudentHeader";
import { useStudent, type LiveSeat } from "../StudentProvider";
import { LiveStudentReal } from "./LiveStudentReal";

export const seatKey = "qafza:seat";

/** the seat survives a refresh: the join step keeps it for the length of the tab */
function readSeat(): LiveSeat | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(seatKey) ?? "null") as LiveSeat | null;
    return v && typeof v.code === "string" && typeof v.sid === "string" ? v : null;
  } catch {
    return null;
  }
}

/** a seat joins the teacher's live session; with none, the student is told to enter a code */
export function LiveStudent() {
  const { seat } = useStudent();
  const [stored, setStored] = useState<LiveSeat | null | undefined>(undefined);

  useEffect(() => {
    // sessionStorage only exists in the browser: read it after mount
    const t = setTimeout(() => setStored(readSeat()), 0);
    return () => clearTimeout(t);
  }, []);

  const mine = seat ?? stored ?? null;
  if (mine) return <LiveStudentReal seat={mine} />;
  if (stored === undefined) return null;

  return (
    <>
      <PlayHeader />
      <div className="mx-auto mt-20 max-w-sm rounded-3xl border border-violet/10 bg-white p-7 text-center shadow-sm">
        <h1 className="text-xl font-bold text-indigo-deep">لست في حصة الآن</h1>
        <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/70">اكتب رمز اللعبة الذي يعرضه المعلّم لتدخل الحصة.</p>
        <Link href="/join" className="mt-5 inline-block rounded-full bg-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30">
          أدخل الرمز
        </Link>
      </div>
    </>
  );
}
