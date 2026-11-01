"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Copy, Ellipsis, Orbit, Search, Waypoints, type LucideIcon } from "lucide-react";
import { api, postJson } from "@/lib/client-api";
import type { LessonSummary } from "@/lib/lesson";
import { TeacherHeader } from "../TeacherHeader";
import { useFlow } from "../FlowProvider";
import { useToast } from "../Toast";
import { fieldCls } from "../ui";

const ICONS: LucideIcon[] = [Orbit, Ellipsis, Copy, Waypoints, BookOpen];
const iconFor = (id: string) => ICONS[[...id].reduce((t, c) => t + c.charCodeAt(0), 0) % ICONS.length];

const FOLDERS_KEY = "qafza:folders";
const noop = () => () => {};
const readFolders = () => {
  try {
    return localStorage.getItem(FOLDERS_KEY) ?? "[]";
  } catch {
    return "[]";
  }
};

const date = new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", numberingSystem: "latn" });

function Art({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="dots relative h-[86px] overflow-hidden rounded-t-3xl bg-gradient-to-br from-indigo-deep to-[#5b21b6]">
      <span className="absolute start-[26%] top-[28%] size-3 rounded-full bg-violet-300" />
      <span className="absolute bottom-[10%] end-[30%] size-3.5 rounded-full bg-sun" />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-[52px] place-items-center rounded-2xl bg-brand text-white shadow-lg">
          <Icon className="size-6" strokeWidth={1.75} />
        </span>
      </span>
    </div>
  );
}

type Action = "open" | "share" | "duplicate" | "archive" | "delete" | { move: string | null };

function CardMenu({ lesson, folders, onAction }: { lesson: LessonSummary; folders: string[]; onAction: (a: Action) => void }) {
  const [open, setOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setMoving(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const item = "block w-full rounded-lg px-3 py-2 text-start text-xs font-semibold text-indigo-deep transition hover:bg-violet/10";
  const run = (a: Action) => {
    onAction(a);
    setOpen(false);
    setMoving(false);
  };

  return (
    <div ref={ref} className="absolute start-3 top-3 z-10">
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`خيارات ${lesson.title}`}
        onClick={() => setOpen((o) => !o)}
        className="grid size-7 place-items-center rounded-lg bg-white/90 text-indigo-deep shadow-sm transition hover:bg-white"
      >
        <Ellipsis className="size-4" />
      </button>
      {open && (
        <div role="menu" className="absolute start-0 top-9 w-44 animate-[pop_.15s_ease-out] rounded-2xl border border-violet/10 bg-white p-1.5 shadow-xl shadow-indigo-deep/15">
          {!moving ? (
            <>
              <button role="menuitem" className={item} onClick={() => run("open")}>
                فتح وتعديل
              </button>
              {!lesson.archived && (
                <button role="menuitem" className={item} onClick={() => run("share")}>
                  مشاركة
                </button>
              )}
              <button role="menuitem" className={item} onClick={() => run("duplicate")}>
                نسخ
              </button>
              <button role="menuitem" className={item} onClick={() => setMoving(true)}>
                نقل إلى مجلد…
              </button>
              <button role="menuitem" className={item} onClick={() => run("archive")}>
                {lesson.archived ? "استعادة من الأرشيف" : "أرشفة"}
              </button>
              <button role="menuitem" className={`${item} text-[#c0174f] hover:bg-rose-50`} onClick={() => run("delete")}>
                حذف
              </button>
            </>
          ) : (
            <>
              {folders.length === 0 && <p className="px-3 py-2 text-[11px] font-medium text-indigo-deep/55">لا مجلدات بعد. أنشئ واحدًا من القائمة الجانبية.</p>}
              {folders.map((f) => (
                <button key={f} role="menuitem" className={`${item} ${lesson.folder === f ? "bg-violet/10 text-violet" : ""}`} onClick={() => run({ move: f })}>
                  {f}
                </button>
              ))}
              <button role="menuitem" className={item} onClick={() => run({ move: null })}>
                بلا مجلد
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function LessonsView() {
  const router = useRouter();
  const toast = useToast();
  const { openSaved } = useFlow();
  const [lessons, setLessons] = useState<LessonSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [confirm, setConfirm] = useState<LessonSummary | null>(null);

  // folders only exist through the lessons inside them, so empty ones are remembered in this browser
  const savedFolders = useSyncExternalStore(noop, readFolders, () => "[]");
  const [extraFolders, setExtraFolders] = useState<string[]>(() => {
    try {
      return JSON.parse(savedFolders) as string[];
    } catch {
      return [];
    }
  });

  // bumping `version` re-reads the list from the server
  const [version, setVersion] = useState(0);
  const load = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let current = true;
    api<{ lessons: LessonSummary[] }>("/api/lessons").then((r) => {
      if (!current) return;
      if (r.ok) {
        setLessons(r.data.lessons);
        setLoadError(null);
      } else setLoadError(r.error);
    });
    return () => {
      current = false;
    };
  }, [version]);

  const all = useMemo(() => lessons ?? [], [lessons]);
  const live = all.filter((l) => !l.archived);
  const folders = useMemo(() => [...new Set([...all.map((l) => l.folder).filter((f): f is string => !!f), ...extraFolders])], [all, extraFolders]);

  const counts = { all: live.length, drafts: live.filter((l) => l.status === "draft").length, archived: all.length - live.length };

  const shown = all.filter((l) => {
    if (filter === "archived") return l.archived;
    if (l.archived) return false;
    if (filter === "drafts" && l.status !== "draft") return false;
    if (filter !== "all" && filter !== "drafts" && l.folder !== filter) return false;
    const q = query.trim();
    return !q || l.title.includes(q) || l.sourceName.includes(q);
  });

  async function open(l: LessonSummary, to: string) {
    if (await openSaved(l.id)) router.push(to);
    else toast.show("تعذّر فتح الدرس. حاول مجددًا.");
  }

  async function act(l: LessonSummary, a: Action) {
    if (a === "open") return open(l, "/create/review");
    if (a === "share") return open(l, "/create/share");
    if (a === "delete") return setConfirm(l);

    if (a === "duplicate") {
      const r = await postJson(`/api/lessons/${l.id}/copy`, {});
      if (!r.ok) return toast.show(r.error);
      toast.show("نُسخ الدرس كمسودة جديدة");
    } else if (a === "archive") {
      const r = await postJson(`/api/lessons/${l.id}`, { archived: !l.archived }, "PATCH");
      if (!r.ok) return toast.show(r.error);
      toast.show(l.archived ? "استُعيد الدرس من الأرشيف" : "أُرشف الدرس");
    } else {
      const r = await postJson(`/api/lessons/${l.id}`, { folder: a.move }, "PATCH");
      if (!r.ok) return toast.show(r.error);
      toast.show(a.move ? `نُقل إلى «${a.move}»` : "أُزيل من المجلد");
    }
    load();
  }

  async function remove(l: LessonSummary) {
    const r = await api(`/api/lessons/${l.id}`, { method: "DELETE" });
    setConfirm(null);
    if (!r.ok) return toast.show(r.error);
    toast.show("حُذف الدرس");
    load();
  }

  function addFolder(e: React.FormEvent) {
    e.preventDefault();
    const n = folderName.trim().slice(0, 40);
    if (n && !folders.includes(n)) {
      const next = [...extraFolders, n];
      setExtraFolders(next);
      try {
        localStorage.setItem(FOLDERS_KEY, JSON.stringify(next));
      } catch {}
    }
    if (n) setFilter(n);
    setFolderName("");
    setAdding(false);
  }

  const sideItem = (id: string, label: string, n: number) => (
    <button
      key={id}
      onClick={() => setFilter(id)}
      aria-current={filter === id ? "true" : undefined}
      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-start text-xs font-bold transition ${filter === id ? "bg-violet/10 text-violet" : "text-indigo-deep hover:bg-violet/5"}`}
    >
      <span>{label}</span>
      <span className={`text-[11px] ${filter === id ? "text-violet" : "text-indigo-deep/45"}`}>{n}</span>
    </button>
  );

  const count = shown.length;
  const countLabel = count === 1 ? "درس واحد" : count === 2 ? "درسان" : count >= 3 && count <= 10 ? `${count} دروس` : `${count} درسًا`;

  return (
    <>
      <TeacherHeader />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 py-7">
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_190px]">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="shrink-0 rounded-full bg-brand px-6 py-3 text-xs font-bold text-white shadow-md shadow-violet/30 transition hover:brightness-110"
              >
                درس جديد
              </button>
              <label className="relative max-w-[340px] flex-1">
                <span className="sr-only">ابحث</span>
                <Search className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-indigo-deep/40" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بعنوان الدرس أو المصدر" className={`${fieldCls} !rounded-full !py-3 pe-11 text-xs`} />
              </label>
            </div>
            {lessons && <p className="mb-3 text-[11px] font-semibold text-indigo-deep/55">{countLabel}</p>}

            {loadError ? (
              <div role="alert" className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center">
                <p className="text-sm font-bold text-rose-700">{loadError}</p>
                <button onClick={load} className="mt-3 rounded-full bg-rose-600 px-6 py-2 text-xs font-bold text-white">
                  أعد المحاولة
                </button>
              </div>
            ) : !lessons ? (
              <p className="py-16 text-center text-sm font-bold text-indigo-deep/50">جارٍ تحميل دروسك…</p>
            ) : shown.length === 0 ? (
              <div className="grid min-h-[220px] place-items-center rounded-3xl border border-dashed border-violet/25 bg-white/50 p-6 text-center">
                <div>
                  <p className="text-sm font-bold text-indigo-deep">{all.length === 0 ? "دروسك ستظهر هنا" : "لا دروس هنا"}</p>
                  <p className="mt-1 text-[11px] text-indigo-deep/55">
                    {all.length === 0 ? "ارفع ملفك الأول، ويجهز الدرس في أقل من دقيقة." : query ? "جرّب كلمة بحث أخرى." : "انقل درسًا إلى هذا المجلد من قائمة الدرس."}
                  </p>
                  {all.length === 0 && (
                    <button onClick={() => router.push("/dashboard")} className="mt-4 rounded-full bg-brand px-7 py-2.5 text-xs font-bold text-white shadow-md shadow-violet/30">
                      أنشئ درسك الأول
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((l) => (
                  <li key={l.id} className="relative">
                    <article className="overflow-hidden rounded-3xl border border-violet/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet/10">
                      <button onClick={() => open(l, "/create/review")} className="block w-full text-start" aria-label={`افتح ${l.title}`}>
                        <Art icon={iconFor(l.id)} />
                        <span className={`absolute end-3 top-3 rounded-full px-3 py-1 text-[10px] font-bold text-white ${l.archived ? "bg-slate-400" : l.status === "draft" ? "bg-slate-500" : "bg-mint"}`}>
                          {l.archived ? "مؤرشف" : l.status === "draft" ? "مسودة" : "منشور"}
                        </span>
                        <div className="p-4">
                          <h3 className="line-clamp-2 text-[17px] font-bold leading-snug text-indigo-deep">{l.title}</h3>
                          <p className="mt-1 text-[10.5px] font-medium leading-5 text-indigo-deep/55">
                            <span dir="ltr">{l.code}</span> · {date.format(l.updatedAt)}
                            {l.sourceName && <> · <span dir="auto">{l.sourceName}</span></>}
                          </p>
                        </div>
                      </button>
                    </article>
                    <CardMenu lesson={l} folders={folders} onAction={(a) => act(l, a)} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="order-first lg:order-none">
            <h1 className="mb-3 text-[34px] font-bold leading-tight text-indigo-deep">دروسي</h1>
            <nav aria-label="مجلدات الدروس" className="rounded-3xl border border-violet/10 bg-white p-2.5 shadow-sm">
              {sideItem("all", "كل الدروس", counts.all)}
              {folders.map((f) => sideItem(f, f, live.filter((l) => l.folder === f).length))}
              {sideItem("drafts", "المسودات", counts.drafts)}
              {sideItem("archived", "المؤرشفة", counts.archived)}
              {adding ? (
                <form onSubmit={addFolder} className="mt-2">
                  <input
                    autoFocus
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    onBlur={() => !folderName && setAdding(false)}
                    placeholder="اسم المجلد"
                    aria-label="اسم المجلد الجديد"
                    className="w-full rounded-xl border border-violet/20 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-violet"
                  />
                </form>
              ) : (
                <button onClick={() => setAdding(true)} className="mt-2 w-full rounded-xl border border-dashed border-violet/30 py-2.5 text-[11px] font-bold text-violet transition hover:bg-violet/5">
                  + مجلد جديد
                </button>
              )}
            </nav>
          </aside>
        </div>
      </main>

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-indigo-deep/40 p-5 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setConfirm(null)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" className="w-full max-w-[400px] animate-[pop_.25s_ease-out] rounded-3xl bg-white p-6 shadow-2xl">
            <h2 id="del-title" className="text-xl font-bold text-indigo-deep">حذف «{confirm.title}»؟</h2>
            <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/65">يُحذف الدرس نهائيًا، ولن يعمل رمزه {confirm.code} بعد الآن. إن أردت الاحتفاظ به فاختر «أرشفة» بدل الحذف.</p>
            <div className="mt-5 flex gap-2.5">
              <button autoFocus onClick={() => remove(confirm)} className="flex-1 rounded-full bg-[#c0174f] py-3 text-xs font-bold text-white">
                احذف نهائيًا
              </button>
              <button onClick={() => setConfirm(null)} className="rounded-full border border-violet/15 px-6 py-3 text-xs font-bold text-violet">
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
      {toast.node}
    </>
  );
}
