export type ModeId = "slides" | "infographic" | "diagram" | "timeline" | "cards" | "dialogue";

export const MODES: { id: ModeId; label: string }[] = [
  { id: "slides", label: "شرائح تفاعلية" },
  { id: "infographic", label: "إنفوجرافيك" },
  { id: "diagram", label: "رسم تفاعلي" },
  { id: "timeline", label: "خط زمني" },
  { id: "cards", label: "بطاقات" },
  { id: "dialogue", label: "حوار" },
];

export const modeLabel = (id: ModeId) => MODES.find((m) => m.id === id)!.label;

export const CHALLENGE_LABELS = {
  mcq: "اختيار من متعدد",
  tf: "صح أو خطأ",
  dnd: "سحب وإفلات",
  match: "مطابقة",
} as const;

export type McqOption = { text: string; explanation: string };

export type Challenge =
  | { kind: "mcq"; question: string; options: McqOption[]; correct: number }
  | { kind: "tf"; statement: string; answer: boolean; explanation: string }
  | { kind: "dnd"; prompt: string; slots: { label: string; card: string }[] }
  | { kind: "match"; prompt: string; pairs: { term: string; meaning: string }[] };

export type Station = {
  id: string;
  title: string;
  mode: ModeId;
  page: number;
  content: string;
  keyIdea: string;
  /** a note the teacher must clear before publishing */
  review?: string;
  challenge: Challenge;
};

export type BossItem = { statement: string; answer: boolean };

export type Lesson = {
  title: string;
  stations: Station[];
  boss: BossItem[];
};

export const AR_LETTERS = ["أ", "ب", "ج", "د"] as const;

/* ---------- customisation (the "خصّص درسك" screen) ---------- */

export type Customization = {
  audience: string;
  minutes: number;
  display: "varied" | ModeId;
  gamification: string;
  assessment: string;
};

export const AUDIENCES = [
  "لليافعين، المرحلة المتوسطة",
  "للأطفال، المرحلة الابتدائية",
  "للمراهقين، المرحلة الثانوية",
  "للجامعيين والمتدرّبين",
];
export const MINUTES = [10, 15, 20, 30];

export const DISPLAY_OPTIONS: { id: Customization["display"]; label: string; hint: string }[] = [
  { id: "varied", label: "متنوّع: شرائح، إنفوجرافيك، خط زمني، حوار، بطاقات", hint: "لكل هدف نمط يناسبه: تعريفات، وتسلسل، وحوار." },
  { id: "slides", label: "شرائح تفاعلية في كل المحطات", hint: "تُكشف النقاط واحدة واحدة." },
  { id: "infographic", label: "إنفوجرافيك في كل المحطات", hint: "كل المعلومات في لوحة واحدة." },
  { id: "timeline", label: "خط زمني في كل المحطات", hint: "مراحل مرتّبة يضغط الطالب عليها." },
  { id: "cards", label: "بطاقات في كل المحطات", hint: "وجه للمصطلح ووجه لمعناه." },
];

export const GAMIFICATION_OPTIONS = [
  { label: "لوحة الصدارة والرتب", hint: "يناسب الحصة المباشرة والتعلّم الذاتي معًا." },
  { label: "الرتب والشارات فقط", hint: "بلا ترتيب بين الطلاب، لمن يفضّل منافسة أهدأ." },
  { label: "المجموعات والزعيم", hint: "فرق متقاربة، وتحدٍّ ختامي مشترك." },
  { label: "بلا تلعيب", hint: "المحطات والتحديات فقط." },
];

export const ASSESSMENT_OPTIONS = [
  { label: "اختيار من متعدد، صح أو خطأ، سحب وإفلات، مطابقة", hint: "تحدٍّ بعد كل محطة، وكل خطأ يُشرح." },
  { label: "اختيار من متعدد وصح أو خطأ", hint: "أبسط وأسرع في المراجعة." },
  { label: "سحب وإفلات ومطابقة", hint: "تطبيق عملي أكثر من الحفظ." },
];

export const DEFAULT_CUSTOM: Customization = {
  audience: AUDIENCES[0],
  minutes: 15,
  display: "varied",
  gamification: GAMIFICATION_OPTIONS[0].label,
  assessment: ASSESSMENT_OPTIONS[0].label,
};

export const optionHint = (list: { label: string; hint: string }[], label: string) =>
  list.find((o) => o.label === label)?.hint ?? "";

/* ---------- the sample lesson: red blood cells ---------- */

const TEMPLATE: Station[] = [
  {
    id: "s1",
    title: "ما خلايا الدم الحمراء؟",
    mode: "slides",
    page: 1,
    content:
      "أكثر خلايا الدم عددًا، ولونها الأحمر هو سرّ وظيفتها. اكشف النقاط واحدة واحدة.\n▪ ما هي؟: أكثر خلايا الدم عددًا في الجسم.\n▪ من أين تأتي؟: تُصنع في نخاع العظم الأحمر.\n▪ سرّ لونها: الهيموغلوبين، بروتين أحمر فيه حديد.\n▪ وظيفتها: تنقل الأكسجين من الرئتين إلى كل خلية.",
    keyIdea: "خلايا الدم الحمراء هي ناقلات الأكسجين في جسمك.",
    challenge: {
      kind: "mcq",
      question: "أين تُصنع خلايا الدم الحمراء في جسم الإنسان البالغ؟",
      options: [
        { text: "في الكبد", explanation: "الكبد يتخلّص من الخلايا القديمة، ولا يصنعها عند البالغ." },
        { text: "في نخاع العظم الأحمر", explanation: "" },
        { text: "في القلب", explanation: "القلب يضخّ الدم، ولا يصنع خلاياه." },
        { text: "في الطحال", explanation: "الطحال يتخلّص من الخلايا القديمة، ولا يصنعها." },
      ],
      correct: 1,
    },
  },
  {
    id: "s2",
    title: "بطاقة تعريف الخلية",
    mode: "infographic",
    page: 1,
    review: "رقم «نحو 5 ملايين خلية في الميليلتر» يختلف قليلًا بين المصادر. تأكد منه قبل النشر.",
    content:
      "ست حقائق في لوحة واحدة. اضغط أيًّا منها.\n▪ الشكل: قرص مقعّر من الجانبين.\n▪ الحجم: نحو 7 إلى 8 ميكرومترات.\n▪ العمر: نحو 120 يومًا، ثم يتخلّص منها الطحال والكبد.\n▪ العدد: نحو 5 ملايين خلية في الميليلتر.\n▪ النواة: لا نواة لها عند النضج.\n▪ الحمل: ملايين جزيئات الهيموغلوبين في كل خلية.",
    keyIdea: "كل صفة في شكل الخلية تخدم وظيفتها.",
    challenge: {
      kind: "tf",
      statement: "خلايا الدم الحمراء الناضجة في الإنسان ليس لها نواة.",
      answer: true,
      explanation: "بل صحيحة: تفقد نواتها عند النضج.",
    },
  },
  {
    id: "s3",
    title: "رحلة الأكسجين",
    mode: "timeline",
    page: 2,
    content:
      "من الرئتين إلى الجسم ثم العودة، في خمس محطات. اضغط أيًّا منها.\n▪ الرئتان: يلتقط الهيموغلوبين الأكسجين.\n▪ القلب: يضخّ الدم المحمّل بالأكسجين.\n▪ الشرايين: تحمله إلى أنحاء الجسم.\n▪ الأنسجة: تُطلق الخلايا الأكسجين لمن يحتاجه.\n▪ الأوردة: تعيد الدم إلى القلب والرئتين.",
    keyIdea: "هذه الرحلة تتكرر في جسمك بلا توقف.",
    challenge: {
      kind: "dnd",
      prompt: "ضع كل بطاقة في مكانها من رحلة الأكسجين.",
      slots: [
        { label: "الرئتان", card: "تلتقط الأكسجين" },
        { label: "القلب", card: "يضخّ الدم في الجسم" },
        { label: "الأنسجة", card: "تُطلق الأكسجين" },
      ],
    },
  },
  {
    id: "s4",
    title: "لماذا هذا الشكل؟",
    mode: "dialogue",
    page: 2,
    content:
      "حوار قصير بين طالبة والمرشد.\n▪ ط: لماذا الخلية مقعّرة من الجانبين؟\n▪ م: تزيد مساحة سطحها، فيدخلها الأكسجين أسرع.\n▪ ط: ولماذا ليس لها نواة؟\n▪ م: ليتّسع المكان لمزيد من الهيموغلوبين.",
    keyIdea: "شكل الخلية مصمّم لوظيفتها.",
    challenge: {
      kind: "match",
      prompt: "طابِق كل صفة بفائدتها.",
      pairs: [
        { term: "الشكل المقعّر", meaning: "مساحة أكبر لتبادل الأكسجين" },
        { term: "غياب النواة", meaning: "مكان أكبر للهيموغلوبين" },
        { term: "المرونة", meaning: "المرور في الشعيرات الضيقة" },
        { term: "الحديد", meaning: "جزء من الهيموغلوبين يرتبط بالأكسجين" },
      ],
    },
  },
  {
    id: "s5",
    title: "مفاهيم مهمة",
    mode: "cards",
    page: 3,
    content:
      "ثلاثة مفاهيم ستقابلها كثيرًا. اقلب كل بطاقة.\n▪ الهيموغلوبين: بروتين فيه حديد، يرتبط بالأكسجين وينقله.\n▪ فقر الدم: نقص الهيموغلوبين أو الخلايا الحمراء، فيصل أكسجين أقل إلى الأنسجة.\n▪ نخاع العظم: نسيج داخل العظام يصنع خلايا الدم.",
    keyIdea: "الحديد في طعامك جزء من قصة الأكسجين.",
    challenge: {
      kind: "mcq",
      question: "يشعر عليٌّ بتعب دائم، وأظهر تحليل دمه نقصًا في الهيموغلوبين. ما التفسير الأقرب؟",
      options: [
        { text: "يصل إلى أنسجته أكسجين أقل", explanation: "" },
        { text: "زادت خلايا دمه البيضاء", explanation: "الخلايا البيضاء للمناعة، ولا تفسّر نقص الهيموغلوبين." },
        { text: "ارتفع ضغط دمه", explanation: "ضغط الدم لا يفسّر نقص الهيموغلوبين." },
        { text: "نقصت صفائحه الدموية", explanation: "الصفائح للتجلّط، لا لنقل الأكسجين." },
      ],
      correct: 0,
    },
  },
];

const BOSS: BossItem[] = [
  { statement: "الهيموغلوبين يحتوي على الحديد.", answer: true },
  { statement: "تعيش خلية الدم الحمراء نحو عام كامل.", answer: false },
  { statement: "تُصنع خلايا الدم الحمراء في القلب.", answer: false },
  { statement: "الشكل المقعّر يزيد مساحة سطح الخلية.", answer: true },
];

export function buildLesson(c: Customization): Lesson {
  const stations: Station[] = structuredClone(TEMPLATE).map((s) => {
    if (c.display !== "varied") s.mode = c.display;
    return s;
  });
  return { title: "خلايا الدم الحمراء", stations, boss: structuredClone(BOSS) };
}


/** a saved lesson as the lists show it (the lesson body is fetched separately) */
export type LessonSummary = {
  id: string;
  code: string;
  title: string;
  sourceName: string;
  status: string;
  folder: string | null;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
};

export const SAMPLE_LESSON_TITLE = "خلايا الدم الحمراء";

/** how a published lesson is meant to be played; stored with the lesson so any device can follow it */
export type ShareConfig = {
  how: "live" | "self";
  devices: "devices" | "board";
  grouping: "individual" | "groups";
  groupCount: 2 | 3 | 4;
  requireLogin: boolean;
  /** the class the lesson is assigned to (results land in its roster), or null */
  classId: string | null;
  /** self-paced deadline, ms since epoch, or null for none */
  dueAt: number | null;
};

export const DEFAULT_SHARE: ShareConfig = { how: "live", devices: "devices", grouping: "groups", groupCount: 3, requireLogin: false, classId: null, dueAt: null };

export function sanitizeShare(raw: unknown): ShareConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    how: r.how === "self" ? "self" : "live",
    devices: r.devices === "board" ? "board" : "devices",
    grouping: r.grouping === "individual" ? "individual" : "groups",
    groupCount: r.groupCount === 2 || r.groupCount === 4 ? r.groupCount : 3,
    requireLogin: r.requireLogin === true,
    classId: typeof r.classId === "string" && r.classId ? r.classId.slice(0, 60) : null,
    dueAt: typeof r.dueAt === "number" && Number.isFinite(r.dueAt) ? r.dueAt : null,
  };
}
