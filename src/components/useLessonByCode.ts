"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import type { Lesson } from "@/lib/lesson";
import { useFlow } from "./teacher/FlowProvider";

export const SAMPLE_CODE = "7QK4";

type State = { code: string; lesson: Lesson | null; missing: boolean };

/**
 * The lesson behind a game code. The sample code and the code of the lesson being edited resolve in memory;
 * any other code is looked up through the public join endpoint (so it also works on another device).
 */
export function useLessonByCode(code: string): { lesson: Lesson | null; loading: boolean; missing: boolean } {
  const { saved, lesson: current, sample } = useFlow();
  const [fetched, setFetched] = useState<State | null>(null);

  const local = code === SAMPLE_CODE ? sample : saved?.code === code ? current : null;

  useEffect(() => {
    if (local) return;
    let live = true;
    api<{ lesson: Lesson }>(`/api/join/${encodeURIComponent(code)}`).then((r) => {
      if (live) setFetched({ code, lesson: r.ok ? r.data.lesson : null, missing: !r.ok });
    });
    return () => {
      live = false;
    };
  }, [code, local]);

  if (local) return { lesson: local, loading: false, missing: false };
  const mine = fetched?.code === code ? fetched : null;
  return { lesson: mine?.lesson ?? null, loading: !mine, missing: !!mine?.missing };
}
