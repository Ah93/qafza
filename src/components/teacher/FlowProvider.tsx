"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, postJson } from "@/lib/client-api";
import type { ClassInfo, ClassKind } from "@/lib/classes";
import {
  DEFAULT_CUSTOM,
  buildLesson,
  type BossItem,
  type Challenge,
  type Customization,
  type Lesson,
  type Station,
} from "@/lib/lesson";

export type SourceType = "file" | "link" | "video" | "text";
/** what the teacher gave us. The raw material (file, link or text) is kept until the lesson is built. */
export type Source = { type: SourceType; name: string; file?: File; url?: string; text?: string; sizeKb?: number };

export type ShareSettings = {
  how: "live" | "self";
  devices: "devices" | "board";
  grouping: "individual" | "groups";
  /** "" = not assigned to a class */
  classId: string;
  groupCount: 2 | 3 | 4;
  requireLogin: boolean;
  due: string;
};

export type NewClass = { name: string; kind: ClassKind; stage: string; subject: string; groups: ClassInfo["groups"]; requireLogin: boolean; students: string[] };

/** the deadline choices on the share screen, in days */
import { PaywallHost } from "./PaywallHost";

export const DUE_DAYS: Record<string, number> = { "بلا موعد": 0, "يوم": 1, "يومان": 2, "3 أيام": 3, "أسبوع": 7 };

export type Saved = { id: string; code: string };
export type GenerateOutcome = { ok: true; truncated: boolean; pages: number } | { ok: false; error: string };
export type SaveOutcome = { ok: true; saved: Saved } | { ok: false; error: string };

type AccountUser = { id: string; email: string; firstName: string; lastName: string; role: "teach" | "learn"; verified: boolean };

type Flow = {
  /** the signed-in account, or null (still loading, or signed out) */
  account: AccountUser | null;
  user: { name: string; initial: string };
  setUserName: (name: string) => void;
  source: Source | null;
  setSource: (s: Source) => void;
  custom: Customization;
  setCustom: (c: Customization) => void;
  lesson: Lesson;
  /** the built-in sample lesson (red blood cells): the demo and the screenshots always use it */
  sample: Lesson;
  /** the lesson on screen was built from this source (so a refresh of the build page does not rebuild it) */
  generatedFrom: Source | null;
  generate: () => Promise<GenerateOutcome>;
  setTitle: (title: string) => void;
  patchStation: (id: string, patch: Partial<Station>) => void;
  patchChallenge: (id: string, patch: Partial<Challenge>) => void;
  setBoss: (boss: BossItem[]) => void;
  saved: Saved | null;
  save: (status?: "draft" | "published") => Promise<SaveOutcome>;
  openSaved: (id: string) => Promise<boolean>;
  /** store how this lesson is to be played, so students on other devices follow it */
  publishShare: () => Promise<{ ok: true } | { ok: false; error: string }>;
  share: ShareSettings;
  setShare: (patch: Partial<ShareSettings>) => void;
  /** null until the first load; pages that show classes call `reloadClasses()` when they open */
  classes: ClassInfo[] | null;
  reloadClasses: () => Promise<void>;
  createClass: (c: NewClass) => Promise<{ ok: true; created: ClassInfo } | { ok: false; error: string }>;
  patchClass: (id: string, patch: { requireLogin?: boolean; groups?: ClassInfo["groups"]; name?: string }) => Promise<boolean>;
  addClassStudents: (id: string, names: string[]) => Promise<boolean>;
  selectedClass: string;
  setSelectedClass: (id: string) => void;
};

const Ctx = createContext<Flow | null>(null);

export function useFlow() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFlow must be used inside FlowProvider");
  return v;
}

const SAMPLE = buildLesson(DEFAULT_CUSTOM);

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AccountUser | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [custom, setCustom] = useState<Customization>(DEFAULT_CUSTOM);
  const [lesson, setLesson] = useState<Lesson>(SAMPLE);
  const [generatedFrom, setGeneratedFrom] = useState<Source | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [share, setShareState] = useState<ShareSettings>({
    how: "live",
    devices: "devices",
    grouping: "groups",
    classId: "",
    groupCount: 3,
    requireLogin: false,
    due: "أسبوع",
  });
  const [classes, setClasses] = useState<ClassInfo[] | null>(null);
  const [selectedClass, setSelectedClass] = useState("");
  const inflight = useRef<Promise<GenerateOutcome> | null>(null);

  useEffect(() => {
    api<{ user: AccountUser | null }>("/api/auth/me").then((r) => r.ok && setAccount(r.data.user));
  }, []);

  const setUserName = useCallback(
    (name: string) => {
      setAccount((a) => (a ? { ...a, firstName: name } : a));
      postJson("/api/auth/me", { first: name }, "PATCH");
    },
    [],
  );

  const reloadClasses = useCallback(async () => {
    const r = await api<{ classes: ClassInfo[] }>("/api/classes");
    if (r.ok) setClasses(r.data.classes);
  }, []);

  const createClass = useCallback(
    async (c: NewClass) => {
      const r = await postJson<{ class: ClassInfo }>("/api/classes", c);
      if (!r.ok) return { ok: false as const, error: r.error };
      await reloadClasses();
      return { ok: true as const, created: r.data.class };
    },
    [reloadClasses],
  );

  const patchClass = useCallback(
    async (id: string, patch: { requireLogin?: boolean; groups?: ClassInfo["groups"]; name?: string }) => {
      const r = await postJson(`/api/classes/${id}`, patch, "PATCH");
      if (r.ok) await reloadClasses();
      return r.ok;
    },
    [reloadClasses],
  );

  const addClassStudents = useCallback(
    async (id: string, names: string[]) => {
      const r = await postJson(`/api/classes/${id}/students`, { names });
      if (r.ok) await reloadClasses();
      return r.ok;
    },
    [reloadClasses],
  );

  /** build the lesson with the AI. A second call while one is running returns the same promise (React strict mode, double clicks). */
  const generate = useCallback((): Promise<GenerateOutcome> => {
    if (inflight.current) return inflight.current;
    if (!source) return Promise.resolve({ ok: false, error: "لا يوجد مصدر. ارجع إلى الرئيسية وارفع ملفك." });

    const run = (async (): Promise<GenerateOutcome> => {
      const form = new FormData();
      form.set("type", source.type);
      if (source.type === "file" && source.file) form.set("file", source.file);
      if (source.type === "text") form.set("text", source.text ?? "");
      if (source.type === "link" || source.type === "video") form.set("url", source.url ?? "");
      form.set("custom", JSON.stringify(custom));

      const r = await api<{ lesson: Lesson; truncated: boolean; pages: number }>("/api/generate", { method: "POST", body: form });
      if (!r.ok) return { ok: false, error: r.error };
      setLesson(r.data.lesson);
      setSaved(null); // a new lesson has not been saved yet
      setGeneratedFrom(source);
      return { ok: true, truncated: r.data.truncated, pages: r.data.pages };
    })().finally(() => {
      inflight.current = null;
    });
    inflight.current = run;
    return run;
  }, [source, custom]);

  const setTitle = useCallback((title: string) => setLesson((l) => ({ ...l, title })), []);

  const patchStation = useCallback((id: string, patch: Partial<Station>) => {
    setLesson((l) => ({ ...l, stations: l.stations.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  }, []);

  const patchChallenge = useCallback((id: string, patch: Partial<Challenge>) => {
    setLesson((l) => ({
      ...l,
      stations: l.stations.map((s) => (s.id === id ? { ...s, challenge: { ...s.challenge, ...patch } as Challenge } : s)),
    }));
  }, []);

  const setBoss = useCallback((boss: BossItem[]) => setLesson((l) => ({ ...l, boss })), []);
  const setShare = useCallback((patch: Partial<ShareSettings>) => setShareState((s) => ({ ...s, ...patch })), []);

  /** create the lesson on the server the first time, then update it on later saves */
  const save = useCallback(
    async (status: "draft" | "published" = "published"): Promise<SaveOutcome> => {
      if (saved) {
        const r = await postJson(`/api/lessons/${saved.id}`, { lesson, status }, "PATCH");
        return r.ok ? { ok: true, saved } : { ok: false, error: r.error };
      }
      const r = await postJson<{ lesson: { id: string; code: string } }>("/api/lessons", { lesson, sourceName: source?.name ?? "", status });
      if (!r.ok) return { ok: false, error: r.error };
      const next = { id: r.data.lesson.id, code: r.data.lesson.code };
      setSaved(next);
      return { ok: true, saved: next };
    },
    [saved, lesson, source],
  );

  const openSaved = useCallback(async (id: string) => {
    const r = await api<{ lesson: Lesson; code: string }>(`/api/lessons/${id}`);
    if (!r.ok) return false;
    setLesson(r.data.lesson);
    setSaved({ id, code: r.data.code });
    setGeneratedFrom(null);
    return true;
  }, []);

  const publishShare = useCallback(async () => {
    if (!saved) return { ok: false as const, error: "احفظ الدرس أولًا." };
    const { how, devices, grouping, groupCount, requireLogin, classId, due } = share;
    const days = DUE_DAYS[due];
    const dueAt = how === "self" && days ? Date.now() + days * 86_400_000 : null;
    const r = await postJson(`/api/lessons/${saved.id}`, { share: { how, devices, grouping, groupCount, requireLogin, classId: classId || null, dueAt } }, "PATCH");
    return r.ok ? { ok: true as const } : { ok: false as const, error: r.error };
  }, [saved, share]);

  const value = useMemo<Flow>(
    () => ({
      account,
      user: { name: account?.firstName ?? "", initial: account?.firstName?.trim()[0] ?? "" },
      setUserName,
      source,
      setSource,
      custom,
      setCustom,
      lesson,
      sample: SAMPLE,
      generatedFrom,
      generate,
      setTitle,
      patchStation,
      patchChallenge,
      setBoss,
      saved,
      save,
      openSaved,
      publishShare,
      share,
      setShare,
      classes,
      reloadClasses,
      createClass,
      patchClass,
      addClassStudents,
      selectedClass,
      setSelectedClass,
    }),
    [account, setUserName, source, custom, lesson, generatedFrom, generate, setTitle, patchStation, patchChallenge, setBoss, saved, save, openSaved, publishShare, share, setShare, classes, reloadClasses, createClass, patchClass, addClassStudents, selectedClass],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <PaywallHost />
    </Ctx.Provider>
  );
}
