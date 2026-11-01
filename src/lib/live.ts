export const CLASS_NAMES = {
  a: "ثاني متوسط (أ)",
  b: "ثاني متوسط (ب)",
  none: "بلا صف",
} as const;

export type Group = { id: string; name: string; color: string; mastery: number };

export const GROUP_POOL: Group[] = [
  { id: "falcons", name: "الصقور", color: "#ec4899", mastery: 70 },
  { id: "pearls", name: "اللؤلؤ", color: "#0ea5e9", mastery: 72 },
  { id: "palms", name: "النخيل", color: "#10b981", mastery: 71 },
  { id: "tigers", name: "النمور", color: "#f59e0b", mastery: 69 },
];

/** the cards a board-only class holds up (colours sampled from the design) */
export const ANSWER_CARDS = [
  { label: "أ", color: "#6d28d9" },
  { label: "ب", color: "#da2778" },
  { label: "ج", color: "#0ea5e9" },
  { label: "د", color: "#f59e0b" },
  { label: "صح", color: "#10b981" },
  { label: "خطأ", color: "#e11d48" },
];

export const ROSTER = ["سارة", "عمر", "نورة", "خالد", "ريم", "يوسف", "لمى", "حمد"];
export const GUESTS = ["ريان", "جود", "سلمى", "فارس", "دانة", "بدر", "هند", "ماجد", "رغد", "مريم", "تركي", "هيا"];

/** students present in the arena when the lobby opens */
export const START_COUNT = 22;
/** students on the class roster (the groups are split from this) */
export const CLASS_SIZE = 26;

/** split `total` students over `groups` as evenly as possible, bigger groups first */
export function splitStudents(total: number, groups: number): number[] {
  const base = Math.floor(total / groups);
  const extra = total % groups;
  return Array.from({ length: groups }, (_, i) => base + (i < extra ? 1 : 0));
}

/** a new guest joins the group with the fewest students */
export function addGuest(sizes: number[]): number[] {
  const min = Math.min(...sizes);
  const at = sizes.indexOf(min);
  return sizes.map((n, i) => (i === at ? n + 1 : n));
}

/**
 * Deterministic "did this group answer correctly" for the simulated devices mode,
 * so the same lesson always replays the same way.
 */
export function simulatedCorrect(groupIndex: number, slide: number) {
  return (groupIndex * 2 + slide * 3) % 5 !== 0;
}

export const AVATAR_COLORS = ["#7c3aed", "#10b981", "#0ea5e9", "#ec4899", "#f97316", "#14b8a6", "#22c55e", "#f59e0b", "#64748b"];
