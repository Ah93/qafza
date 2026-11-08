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
  /** the lesson on screen is the teacher's own (built, opened or restored), not the built-in sample */
  hasDraft: boolean;
  /** the saved draft has been looked for (until then `hasDraft` may still turn true) */
  draftReady: boolean;
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
  /** swap a station's challenge for another one (a different kind) */
  replaceChallenge: (id: string, challenge: Challenge) => void;
  setBoss: (boss: BossItem[]) => void;
  /** step back through the last 20 edits */
  undo: () => void;
  canUndo: boolean;
  /** the draft is saved on its own two seconds after every edit */
  autosave: "idle" | "saving" | "saved" | "error";
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
  patchClass: (id: string, patch: ClassPatch) => Promise<boolean>;
  /** put a student in a group by hand (null: back to the automatic split); `reset` clears every manual placement */
  moveStudent: (classId: string, studentId: string, group: number | null) => Promise<boolean>;
  resetGroups: (classId: string) => Promise<boolean>;
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
/** what the teacher can change about a class after creating it */
export type ClassPatch = { requireLogin?: boolean; groups?: ClassInfo["groups"]; name?: string; kind?: ClassKind; stage?: string; subject?: string; struggleBelow?: number };

const DRAFT_KEY = "qafza:draft";

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AccountUser | null>(null);
  const [source, setSourceState] = useState<Source | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [custom, setCustom] = useState<Customization>(DEFAULT_CUSTOM);
  const [lesson, setLesson] = useState<Lesson>(SAMPLE);
  const [generatedFrom, setGeneratedFrom] = useState<Source | null>(null);
  const [saved, setSavedState] = useState<Saved | null>(null);
  const [dirty, setDirty] = useState(false);
  const [autosave, setAutosave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [undoCount, setUndoCount] = useState(0);
  // refs hold the latest values for the save queue and the history, which must not read stale closures
  const lessonRef = useRef<Lesson>(SAMPLE);
  const savedRef = useRef<Saved | null>(null);
  const sourceRef = useRef<Source | null>(null);
  const history = useRef<Lesson[]>([]);
  const lastPush = useRef(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const setSaved = useCallback((v: Saved | null) => {
    savedRef.current = v;
    setSavedState(v);
  }, []);
  /** replace the whole lesson (built, opened, restored): there is nothing to step back to, and nothing unsaved */
  const replaceLesson = useCallback((l: Lesson, unsaved: boolean) => {
    lessonRef.current = l;
    setLesson(l);
    history.current = [];
    setUndoCount(0);
    setDirty(unsaved);
    setAutosave("idle");
  }, []);
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
    sourceRef.current = source;
  }, [source]);

  // the lesson being edited survives a refresh or a trip back through the browser history (this tab only)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null") as { lesson?: Lesson; saved?: Saved | null } | null;
        if (d?.lesson && Array.isArray(d.lesson.stations) && d.lesson.stations.length) {
          replaceLesson(d.lesson, false);
          setSaved(d.saved ?? null);
          setHasDraft(true);
        }
      } catch {}
      setDraftReady(true);
    }, 0);
    return () => clearTimeout(t);
  }, [replaceLesson, setSaved]);
  useEffect(() => {
    if (!hasDraft) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ lesson, saved }));
    } catch {}
  }, [hasDraft, lesson, saved]);

  /** a new source starts a new lesson: whatever was being edited is dropped */
  const setSource = useCallback((s: Source) => {
    setSourceState(s);
    setHasDraft(false);
    replaceLesson(SAMPLE, false);
    setSaved(null);
    setGeneratedFrom(null);
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
  }, [replaceLesson, setSaved]);

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
    async (id: string, patch: ClassPatch) => {
      const r = await postJson(`/api/classes/${id}`, patch, "PATCH");
      if (r.ok) await reloadClasses();
      return r.ok;
    },
    [reloadClasses],
  );

  const moveStudent = useCallback(
    async (classId: string, studentId: string, group: number | null) => {
      const r = await postJson(`/api/classes/${classId}/students`, { student: studentId, group }, "PATCH");
      if (r.ok) await reloadClasses();
      return r.ok;
    },
    [reloadClasses],
  );

  const resetGroups = useCallback(
    async (classId: string) => {
      const r = await postJson(`/api/classes/${classId}/students`, { reset: true }, "PATCH");
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
      replaceLesson(r.data.lesson, true); // unsaved: the autosave makes it a draft within seconds
      setHasDraft(true);
      setSaved(null);
      setGeneratedFrom(source);
      return { ok: true, truncated: r.data.truncated, pages: r.data.pages };
    })().finally(() => {
      inflight.current = null;
    });
    inflight.current = run;
    return run;
  }, [source, custom, replaceLesson, setSaved]);

  /** every change to the lesson goes through here: it is remembered for undo (typing is grouped) and marks the lesson unsaved */
  const edit = useCallback((fn: (l: Lesson) => Lesson) => {
    const before = lessonRef.current;
    const after = fn(before);
    if (after === before) return;
    const now = Date.now();
    if (now - lastPush.current > 800) {
      history.current = [...history.current.slice(-19), before];
      setUndoCount(history.current.length);
    }
    lastPush.current = now;
    lessonRef.current = after;
    setLesson(after);
    setDirty(true);
  }, []);

  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (!prev) return;
    setUndoCount(history.current.length);
    lastPush.current = 0;
    lessonRef.current = prev;
    setLesson(prev);
    setDirty(true);
  }, []);

  const setTitle = useCallback((title: string) => edit((l) => ({ ...l, title })), [edit]);

  const patchStation = useCallback(
    (id: string, patch: Partial<Station>) => edit((l) => ({ ...l, stations: l.stations.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
    [edit],
  );

  const patchChallenge = useCallback(
    (id: string, patch: Partial<Challenge>) =>
      edit((l) => ({ ...l, stations: l.stations.map((x) => (x.id === id ? { ...x, challenge: { ...x.challenge, ...patch } as Challenge } : x)) })),
    [edit],
  );

  const replaceChallenge = useCallback(
    (id: string, challenge: Challenge) => edit((l) => ({ ...l, stations: l.stations.map((x) => (x.id === id ? { ...x, challenge } : x)) })),
    [edit],
  );

  const setBoss = useCallback((boss: BossItem[]) => edit((l) => ({ ...l, boss })), [edit]);
  const setShare = useCallback((patch: Partial<ShareSettings>) => setShareState((s) => ({ ...s, ...patch })), []);

  /** create the lesson on the server the first time, then update it on later saves */
  /** one save at a time (autosave and "share" never race and never create the lesson twice); `status` only when it must change */
  const persist = useCallback((status?: "draft" | "published"): Promise<SaveOutcome> => {
    const run = async (): Promise<SaveOutcome> => {
      const l = lessonRef.current;
      const s0 = savedRef.current;
      if (s0) {
        const r = await postJson(`/api/lessons/${s0.id}`, status ? { lesson: l, status } : { lesson: l }, "PATCH");
        if (!r.ok) return { ok: false, error: r.error };
        if (lessonRef.current === l) setDirty(false);
        return { ok: true, saved: s0 };
      }
      const r = await postJson<{ lesson: { id: string; code: string } }>("/api/lessons", { lesson: l, sourceName: sourceRef.current?.name ?? "", status: status ?? "draft" });
      if (!r.ok) return { ok: false, error: r.error };
      const next = { id: r.data.lesson.id, code: r.data.lesson.code };
      setSaved(next);
      if (lessonRef.current === l) setDirty(false);
      return { ok: true, saved: next };
    };
    const job = queue.current.then(run);
    queue.current = job.catch(() => undefined);
    return job;
  }, [setSaved]);

  const save = useCallback((status: "draft" | "published" = "published") => persist(status), [persist]);

  // the draft saves itself two seconds after the last edit
  useEffect(() => {
    if (!dirty || !hasDraft) return;
    const t = setTimeout(async () => {
      setAutosave("saving");
      const r = await persist();
      setAutosave(r.ok ? "saved" : "error");
    }, 2000);
    return () => clearTimeout(t);
  }, [dirty, lesson, hasDraft, persist]);

  const openSaved = useCallback(async (id: string) => {
    const r = await api<{ lesson: Lesson; code: string }>(`/api/lessons/${id}`);
    if (!r.ok) return false;
    replaceLesson(r.data.lesson, false);
    setHasDraft(true);
    setSaved({ id, code: r.data.code });
    setGeneratedFrom(null);
    return true;
  }, [replaceLesson, setSaved]);

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
      hasDraft,
      draftReady,
      custom,
      setCustom,
      lesson,
      sample: SAMPLE,
      generatedFrom,
      generate,
      setTitle,
      patchStation,
      patchChallenge,
      replaceChallenge,
      undo,
      canUndo: undoCount > 0,
      autosave,
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
      moveStudent,
      resetGroups,
      addClassStudents,
      selectedClass,
      setSelectedClass,
    }),
    [account, setUserName, hasDraft, draftReady, source, setSource, custom, lesson, generatedFrom, generate, setTitle, patchStation, patchChallenge, replaceChallenge, undo, undoCount, autosave, setBoss, saved, save, openSaved, publishShare, share, setShare, classes, reloadClasses, createClass, patchClass, addClassStudents, moveStudent, resetGroups, selectedClass],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <PaywallHost />
    </Ctx.Provider>
  );
}
