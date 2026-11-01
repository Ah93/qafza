"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/client-api";
import type { Lesson, ShareConfig } from "@/lib/lesson";
import type { BadgeId } from "@/lib/play";
import { useFlow } from "../teacher/FlowProvider";

export type LessonResult = {
  points: number;
  right: number;
  total: number;
  accuracy: number;
  minutes: number;
  modes: number;
  badges: BadgeId[];
  cards: number[];
  bestStreak: number;
  hearts: number;
  bossBeaten: boolean;
  /** challenges the student missed: they come back in the daily review */
  missed: number[];
  startPoints: number;
  /** the lesson that was played, so the result page can talk about it */
  lesson: Lesson;
};

/** a lesson the student entered by code: loaded from the server, so it works on any device */
export type Joined = { code: string; lesson: Lesson; share: ShareConfig; teacher: string; className: string | null };

/** a seat in a running live session */
export type LiveSeat = { code: string; sid: string; group: number | null; mates: string[]; mode: "groups" | "individual"; groupCount: number };

/** what the server knows about a signed-in student (see src/lib/server/progress.ts) */
export type Progress = {
  points: number;
  rank: string;
  streak: number;
  reviewedToday: boolean;
  badges: BadgeId[];
  cards: Record<string, number[]>;
  cardCount: number;
  lessonsDone: number;
  accuracy: number | null;
  since: number;
  dueCount: number;
  history: { lessonId: string; title: string; mode: string; at: number; accuracy: number; code: string }[];
  inProgress: { code: string; title: string; reached: number; total: number } | null;
};

type Student = {
  /** a stable id for this browser: it ties a guest's attempts and live seat together across refreshes */
  deviceRef: string;
  name: string;
  setName: (n: string) => void;
  joined: Joined | null;
  setJoined: (j: Joined | null) => void;
  seat: LiveSeat | null;
  setSeat: (s: LiveSeat | null) => void;
  result: LessonResult | null;
  setResult: (r: LessonResult) => void;
  /** null for a guest, or until it has loaded */
  progress: Progress | null;
  refreshProgress: () => Promise<void>;
};

const Ctx = createContext<Student | null>(null);

export function useStudent() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStudent must be used inside StudentProvider");
  return v;
}

const noop = () => () => {};
function readRef(): string {
  try {
    let v = localStorage.getItem("qafza:device");
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem("qafza:device", v);
    }
    return v;
  } catch {
    return "";
  }
}
const readName = () => {
  try {
    return localStorage.getItem("qafza:name") ?? "";
  } catch {
    return "";
  }
};

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const { account } = useFlow();
  const deviceRef = useSyncExternalStore(noop, readRef, () => "");
  const stored = useSyncExternalStore(noop, readName, () => "");
  const [typed, setTyped] = useState<string | null>(null);
  const [joined, setJoined] = useState<Joined | null>(null);
  const [seat, setSeat] = useState<LiveSeat | null>(null);
  const [result, setResultState] = useState<LessonResult | null>(null);
  const [loaded, setProgress] = useState<Progress | null>(null);
  // signing out hides what was loaded for the account
  const progress = account ? loaded : null;

  // the name a student plays under: what they typed, else the last one used here, else their account's
  const name = typed ?? (stored || account?.firstName || "");
  const setName = useCallback((n: string) => {
    setTyped(n);
    try {
      localStorage.setItem("qafza:name", n);
    } catch {}
  }, []);

  const refreshProgress = useCallback(async () => {
    const r = await api<{ progress: Progress }>("/api/me/progress");
    if (r.ok) setProgress(r.data.progress);
  }, []);

  useEffect(() => {
    if (!account) return;
    let current = true;
    api<{ progress: Progress }>("/api/me/progress").then((r) => current && r.ok && setProgress(r.data.progress));
    return () => {
      current = false;
    };
  }, [account]);

  const setResult = useCallback((r: LessonResult) => setResultState(r), []);

  const value = useMemo<Student>(
    () => ({ deviceRef, name, setName, joined, setJoined, seat, setSeat, result, setResult, progress, refreshProgress }),
    [deviceRef, name, setName, joined, seat, result, setResult, progress, refreshProgress],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
