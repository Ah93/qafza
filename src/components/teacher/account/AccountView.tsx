"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { TeacherHeader } from "../TeacherHeader";
import { useFlow } from "../FlowProvider";
import { api, postJson } from "@/lib/client-api";
import { dateAr, usePlan } from "../usePlan";
import { money } from "@/lib/pricing";
import type { Invoice } from "@/lib/server/invoices";
import { useToast } from "../Toast";
import { Chip, Label, Switch, fieldCls } from "../ui";

const SECTIONS = [
  { id: "profile", label: "الملف الشخصي" },
  { id: "where", label: "أين تعلّم" },
  { id: "lang", label: "اللغة والتقويم" },
  { id: "notify", label: "الإشعارات" },
  { id: "privacy", label: "الخصوصية والبيانات" },
  { id: "plan", label: "الاشتراك" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

const STAGES = ["ابتدائي", "متوسط", "ثانوي", "جامعي", "تدريب", "أخرى"];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-violet/10 bg-white p-6 shadow-xl shadow-violet/5 sm:p-8">
      <h2 className="text-[30px] font-bold leading-tight text-indigo-deep">{title}</h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function SaveButton({ onClick, children = "احفظ التغييرات" }: { onClick: () => void; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-brand px-9 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110"
    >
      {children}
    </button>
  );
}

function ToggleRow({
  title,
  body,
  checked,
  onChange,
}: {
  title: string;
  body: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-2xl bg-violet/[0.05] px-5 py-4">
      <Switch label={title} checked={checked} onChange={onChange} />
      <span>
        <span className="block text-sm font-bold text-indigo-deep">{title}</span>
        <span className="mt-0.5 block text-xs font-medium leading-5 text-indigo-deep/70">{body}</span>
      </span>
    </label>
  );
}

export function AccountView() {
  const { plan } = usePlan();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  useEffect(() => {
    let live = true;
    api<{ invoices: Invoice[] }>("/api/billing/invoices").then((r) => live && r.ok && setInvoices(r.data.invoices));
    return () => {
      live = false;
    };
  }, []);
  const { user, account, setUserName } = useFlow();
  const toast = useToast();
  const [section, setSection] = useState<SectionId>("profile");

  // profile
  // null = untouched: the field follows the loaded account until the teacher types
  const [typedName, setName] = useState<string | null>(null);
  const name = typedName ?? user.name;
  const [subjects, setSubjects] = useState(["الأحياء", "العلوم"]);
  const [subjectDraft, setSubjectDraft] = useState("");
  const [stage, setStage] = useState("متوسط");

  // where
  const [place, setPlace] = useState("مدرسة");
  const [org, setOrg] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState(false);

  // language
  const [calendar, setCalendar] = useState("ميلادي");
  const [week, setWeek] = useState("الأحد");

  // notifications
  const [notes, setNotes] = useState({ report: true, struggling: true, done: true, news: false });

  // delete
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  function addSubject(e: React.FormEvent) {
    e.preventDefault();
    const v = subjectDraft.trim();
    if (v && !subjects.includes(v)) setSubjects((s) => [...s, v]);
    setSubjectDraft("");
  }

  async function exportData() {
    try {
      const res = await fetch("/api/auth/export");
      if (!res.ok) throw new Error("export");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(await res.blob());
      a.download = "qafza-my-data.json";
      a.click();
      URL.revokeObjectURL(a.href);
      toast.show("نُزّلت بياناتك كملف JSON");
    } catch {
      toast.show("تعذّر تصدير بياناتك. حاول مجددًا.");
    }
  }

  /** sign out / delete: a full reload on purpose, so no lesson or account state survives in memory */
  function leave(to: string) {
    window.location.href = to;
  }

  async function signOut() {
    await postJson("/api/auth/logout", {});
    leave("/login");
  }

  async function deleteAccount() {
    const r = await api("/api/auth/me", { method: "DELETE" });
    if (!r.ok) return toast.show(r.error);
    leave("/");
  }

  return (
    <>
      <TeacherHeader />
      <main className="mx-auto grid w-full max-w-[1000px] flex-1 items-start gap-6 px-5 py-8 lg:grid-cols-[250px_1fr]">
        <aside className="rounded-3xl border border-violet/10 bg-white p-4 shadow-sm">
          <h1 className="mb-2 px-2 text-[26px] font-bold text-indigo-deep">حسابي</h1>
          <nav aria-label="أقسام الحساب" className="space-y-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                aria-current={section === s.id ? "page" : undefined}
                className={`block w-full rounded-xl px-4 py-3 text-start text-xs font-bold transition ${
                  section === s.id ? "bg-violet/10 text-violet" : "text-indigo-deep/70 hover:bg-violet/5 hover:text-indigo-deep"
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>
          <div className="mt-2 border-t border-violet/10 pt-2">
            <button onClick={signOut} className="block w-full rounded-xl px-4 py-3 text-start text-xs font-bold text-[#c0174f] transition hover:bg-rose-50">
              تسجيل الخروج
            </button>
          </div>
        </aside>

        <div>
          {section === "profile" && (
            <Card title="الملف الشخصي">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pname">الاسم</Label>
                  <input id="pname" value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} />
                </div>
                <div>
                  <Label htmlFor="pemail">البريد</Label>
                  <input id="pemail" type="email" dir="ltr" value={account?.email ?? ""} readOnly aria-describedby="pemail-note" className={`${fieldCls} cursor-not-allowed bg-violet/[0.04] text-start text-indigo-deep/70`} />
                  <p id="pemail-note" className="mt-1.5 text-xs font-medium text-indigo-deep/70">تغيير البريد يحتاج تأكيدًا جديدًا، وسنفعّله مع ربط مزوّد البريد.</p>
                </div>
              </div>

              <div>
                <Label htmlFor="psub">المواد التي تدرّسها</Label>
                <form onSubmit={addSubject} className="flex gap-2.5">
                  <input
                    id="psub"
                    value={subjectDraft}
                    onChange={(e) => setSubjectDraft(e.target.value)}
                    placeholder="اكتب اسم المادة، مثل: الكيمياء"
                    className={`${fieldCls} flex-1`}
                  />
                  <button className="rounded-2xl bg-indigo-deep px-6 text-sm font-bold text-white transition hover:bg-indigo-ink">أضف</button>
                </form>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {subjects.map((s) => (
                    <li key={s} className="flex items-center gap-2 rounded-full bg-violet/10 py-1.5 pe-4 ps-2.5 text-xs font-bold text-violet">
                      <button
                        onClick={() => setSubjects((all) => all.filter((x) => x !== s))}
                        aria-label={`احذف ${s}`}
                        className="grid size-5 place-items-center rounded-full bg-violet/15 transition hover:bg-violet/30"
                      >
                        <X className="size-3" strokeWidth={3} />
                      </button>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <Label>المرحلة</Label>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map((s) => (
                    <Chip key={s} on={stage === s} onClick={() => setStage(s)}>
                      {s}
                    </Chip>
                  ))}
                </div>
              </div>

              <SaveButton
                onClick={() => {
                  if (name.trim()) setUserName(name.trim());
                  toast.show("حُفظت التغييرات");
                }}
              />
            </Card>
          )}

          {section === "where" && (
            <Card title="أين تعلّم">
              <div>
                <Label>نوع الجهة</Label>
                <div className="flex flex-wrap gap-2">
                  {["مدرسة", "جامعة", "معهد أو مركز تدريب", "تدريس خاص"].map((p) => (
                    <Chip key={p} on={place === p} onClick={() => setPlace(p)}>
                      {p}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="org">اسم الجهة</Label>
                  <input id="org" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="اسم المدرسة أو الجامعة" className={fieldCls} />
                </div>
                <div>
                  <Label htmlFor="city">المدينة والدولة</Label>
                  <input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثال: الرياض، السعودية" className={fieldCls} />
                </div>
              </div>
              <ToggleRow
                title="حفظ البيانات داخل المنطقة"
                body="للمدارس والمؤسسات: تُحفظ بيانات طلابك داخل المنطقة، وفق نظام حماية البيانات المحلي."
                checked={region}
                onChange={setRegion}
              />
              <SaveButton onClick={() => toast.show("حُفظت بيانات الجهة")} />
            </Card>
          )}

          {section === "lang" && (
            <Card title="اللغة والتقويم">
              <div>
                <Label>لغة الواجهة</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip on onClick={() => {}}>
                    العربية
                  </Chip>
                  <Chip on={false} disabled>
                    English
                  </Chip>
                  <span className="text-xs font-medium text-indigo-deep/70">الإنجليزية قريبًا.</span>
                </div>
              </div>
              <div>
                <Label>التقويم</Label>
                <div className="flex gap-2">
                  {["ميلادي", "هجري"].map((c) => (
                    <Chip key={c} on={calendar === c} onClick={() => setCalendar(c)}>
                      {c}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <Label>أول أيام الأسبوع</Label>
                <div className="flex gap-2">
                  {["السبت", "الأحد", "الاثنين"].map((d) => (
                    <Chip key={d} on={week === d} onClick={() => setWeek(d)}>
                      {d}
                    </Chip>
                  ))}
                </div>
              </div>
              <SaveButton onClick={() => toast.show("حُفظت اللغة والتقويم")} />
            </Card>
          )}

          {section === "notify" && (
            <Card title="الإشعارات">
              <ToggleRow
                title="تقرير بعد كل حصة"
                body="ملخّص الإتقان وفجوات الفهم فور انتهاء الحصة."
                checked={notes.report}
                onChange={(v) => setNotes((n) => ({ ...n, report: v }))}
              />
              <ToggleRow
                title="الطلاب المتعثّرون"
                body="تنبيه حين يقلّ إتقان طالب عن 60%."
                checked={notes.struggling}
                onChange={(v) => setNotes((n) => ({ ...n, struggling: v }))}
              />
              <ToggleRow
                title="اكتمال التعلّم الذاتي"
                body="إشعار عند انتهاء الموعد أو حين يكمل الجميع."
                checked={notes.done}
                onChange={(v) => setNotes((n) => ({ ...n, done: v }))}
              />
              <ToggleRow
                title="أخبار قفزة"
                body="مزايا جديدة وأفكار للتدريس، مرة في الشهر."
                checked={notes.news}
                onChange={(v) => setNotes((n) => ({ ...n, news: v }))}
              />
              <SaveButton onClick={() => toast.show("حُفظت الإشعارات")} />
            </Card>
          )}

          {section === "privacy" && (
            <Card title="الخصوصية والبيانات">
              <p className="text-xs font-medium leading-6 text-indigo-deep/70">
                تصدّر بياناتك أو تحذف حسابك في أي وقت. نحفظ الاسم والبريد، والملفات التي ترفعها، ودروسك، ونتائج طلابك. اقرأ{" "}
                <Link href="/privacy" className="font-bold text-violet underline underline-offset-2">
                  سياسة الخصوصية
                </Link>
                .
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={exportData} className="rounded-full border border-violet/15 bg-white px-7 py-3 text-xs font-bold text-violet transition hover:border-violet/40">
                  صدّر بياناتي
                </button>
                <button
                  onClick={() => setDeleting(true)}
                  className="rounded-full border border-rose-200 bg-rose-50 px-7 py-3 text-xs font-bold text-[#c0174f] transition hover:bg-rose-100"
                >
                  احذف حسابي وبياناتي
                </button>
              </div>
            </Card>
          )}

          {section === "plan" && (
            <Card title="الاشتراك">
              <div className="rounded-2xl bg-violet/[0.05] p-5">
                <p className="text-xs font-bold text-violet">خطتك الحالية</p>
                <p className="mt-1 text-xl font-bold text-indigo-deep">{plan?.open ? "الدروس مفتوحة" : plan?.entitled ? "قفزة الكاملة" : "التجربة المجانية"}</p>
                <p className="mt-1 text-xs font-medium text-indigo-deep/70">
                  {!plan
                    ? "جارٍ التحميل…"
                    : plan.open
                      ? "الدروس مفتوحة للجميع حاليًا بلا حد. سنعلن حين تُفتح الاشتراكات."
                    : plan.entitled
                      ? `اشتراكك (${plan.plan === "year" ? "العام الدراسي" : "شهري"}) ساري حتى ${dateAr(plan.until!)}.`
                      : plan.lessonsCreated >= plan.freeLimit
                        ? "استخدمت درسك المجاني. طلابك يلعبون مجانًا دائمًا."
                        : "لك درس واحد كامل مجانًا. طلابك يلعبون مجانًا دائمًا."}
                </p>
              </div>
              <Link
                href="/pricing"
                className="inline-block rounded-full bg-brand px-9 py-3 text-sm font-bold text-white shadow-lg shadow-violet/30 transition hover:brightness-110"
              >
                {plan?.entitled ? "جدّد اشتراكك" : "اشترك في قفزة الكاملة"}
              </Link>
              <h3 className="mt-6 text-sm font-bold text-indigo-deep">الفواتير</h3>
              {invoices.length === 0 ? (
                <p className="mt-2 text-xs font-medium text-indigo-deep/70">لا فواتير بعد. تصلك فاتورة بالبريد بعد كل دفعة، وتجدها هنا.</p>
              ) : (
                <ul className="mt-2 divide-y divide-violet/10 rounded-2xl border border-violet/10">
                  {invoices.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs font-bold text-indigo-deep">
                      <span dir="ltr">{i.number}</span>
                      <span>{money(i.currency, i.total)}</span>
                      <Link href={`/account/invoices/${i.id}`} className="text-violet underline underline-offset-4">
                        افتح الفاتورة
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </main>

      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-indigo-deep/40 p-5 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setDeleting(false)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="del-acc" className="w-full max-w-[420px] animate-[pop_.25s_ease-out] rounded-3xl bg-white p-6 shadow-2xl">
            <h2 id="del-acc" className="text-xl font-bold text-indigo-deep">حذف حسابك نهائيًا؟</h2>
            <p className="mt-2 text-xs font-medium leading-6 text-indigo-deep/70">
              تُحذف دروسك وصفوفك ونتائج طلابك، ولا يمكن التراجع. للتأكيد اكتب «احذف».
            </p>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              aria-label="اكتب احذف للتأكيد"
              className={`${fieldCls} mt-4`}
            />
            <div className="mt-4 flex gap-2.5">
              <button
                disabled={confirmText.trim() !== "احذف"}
                onClick={deleteAccount}
                className="flex-1 rounded-full bg-[#c0174f] py-3 text-xs font-bold text-white transition disabled:opacity-40"
              >
                احذف حسابي
              </button>
              <button
                onClick={() => {
                  setDeleting(false);
                  setConfirmText("");
                }}
                className="rounded-full border border-violet/15 px-6 py-3 text-xs font-bold text-violet"
              >
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
