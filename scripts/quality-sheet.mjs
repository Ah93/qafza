// Scoring sheet for the "20 real lessons" quality gate.
//   node scripts/quality-sheet.mjs [--out quality.csv] [--email teacher@x.com] [--all]
// Writes a CSV with one row per lesson: automatic checks the machine can do (grounding in the source, answer-position
// spread, wording length, variety) and EMPTY columns for the five human scores (1-5). The humans decide the quality;
// the numbers only point at lessons worth reading first. Lessons built before the source pages were kept have no grounding score.
//
// By default only lessons of real accounts are listed (not @example.com test accounts).
import { readFileSync, writeFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), v === "--all" ? "1" : all[i + 1]]] : a), []));
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }),
);
const db = getFirestore(initializeApp({ credential: cert({ projectId: env.FIREBASE_PROJECT_ID, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") }) }));

const norm = (s) => s.replace(/[ً-ٰٟـ]/g, "").replace(/[إأآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").toLowerCase();
const words = (s) => norm(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2).map((w) => w.replace(/^ال/, ""));
const wc = (s) => s.trim().split(/\s+/).filter(Boolean).length;

const users = new Map((await db.collection("users").select("email").get()).docs.map((d) => [d.id, d.data().email]));
const snap = await db.collection("lessons").get();
const rows = [];
for (const d of snap.docs) {
  const r = d.data();
  const email = users.get(r.userId) ?? "";
  if (args.email && email !== args.email) continue;
  if (!args.all && !args.email && (!email || email.endsWith("@example.com"))) continue;
  let lesson;
  try { lesson = JSON.parse(r.data); } catch { continue; }
  const pages = r.sourcePages ? JSON.parse(r.sourcePages) : null;
  const st = lesson.stations;

  // grounding: how much of each key idea's vocabulary appears on the page it cites
  let grounded = "";
  if (pages) {
    const ratios = st.map((s) => {
      const page = pages.find((p) => p.n === s.page)?.text ?? "";
      const have = new Set(words(page));
      const ws = [...new Set(words(`${s.keyIdea} ${s.title}`))];
      return ws.length ? ws.filter((w) => have.has(w)).length / ws.length : 1;
    });
    grounded = Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100);
  }

  const mcq = st.map((s) => s.challenge).filter((c) => c.kind === "mcq");
  const pos = [0, 0, 0, 0];
  mcq.forEach((c) => pos[c.correct]++);
  const kinds = new Set(st.map((s) => s.challenge.kind)).size;
  const modes = new Set(st.map((s) => s.mode)).size;
  const longest = Math.max(...st.map((s) => wc(s.content.split("\n").filter((l) => !l.startsWith("▪"))[0] ?? "")), 0);
  const noWhy = mcq.reduce((t, c) => t + c.options.filter((o, i) => i !== c.correct && !o.explanation).length, 0);
  const flagged = st.filter((s) => s.review).length;

  rows.push({
    code: r.code, title: r.title, teacher: email, stations: st.length, challengeKinds: kinds, displayModes: modes,
    groundedPct: grounded, correctPositions: pos.join("/"), longestLeadWords: longest, wrongOptionsWithoutWhy: noWhy, stationsFlaggedForReview: flagged,
  });
}

const HUMAN = ["accuracy_1to5", "clarity_1to5", "fits_age_1to5", "challenges_fair_1to5", "would_use_as_is_1to5", "notes"];
const cols = [...Object.keys(rows[0] ?? { code: 1 }), ...HUMAN];
const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const csv = "﻿" + [cols.join(","), ...rows.map((r) => [...Object.values(r), ...HUMAN.map(() => "")].map(esc).join(","))].join("\n");
const out = args.out ?? "quality-sheet.csv";
writeFileSync(out, csv);
console.log(`${rows.length} lesson(s) written to ${out}`);
if (rows.length < 20) console.log(`the gate needs 20 real lessons; ${20 - rows.length} more to build`);
rows.filter((r) => r.groundedPct !== "" && r.groundedPct < 60).forEach((r) => console.log(`  read first: ${r.code} "${r.title}" (grounded ${r.groundedPct}%)`));
process.exit(0);
