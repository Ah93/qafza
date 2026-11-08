// Live-class load test: one teacher, N simulated student devices (default 35), each with its own event stream,
// all answering every challenge. It measures how long the room takes to follow the teacher and how long answers take.
//
//   node scripts/load-test.mjs --base http://localhost:3000 --email teacher@x.com --password '...' --code AB12 --students 35
//
// `--code` is the code of a lesson owned by that teacher (the session is opened and driven slide by slide).
// This proves the server side (one process, 35 streams). It cannot replace a run with 35 real phones on a school's
// wifi: the network in the room is the part this does not cover.

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const B = (args.base ?? "http://localhost:3000").replace(/\/$/, "");
const N = Number(args.students ?? 35);
const CODE = String(args.code ?? "").toUpperCase();
if (!CODE || !args.email || !args.password) {
  console.error("usage: node scripts/load-test.mjs --base URL --email E --password P --code LESSONCODE [--students 35] [--dwell 1200]");
  process.exit(2);
}
const DWELL = Number(args.dwell ?? 1200);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (xs, p) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))] : NaN);

async function http(path, { method = "GET", body, cookie } = {}) {
  const t0 = performance.now();
  const r = await fetch(B + path, { method, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const set = r.headers.getSetCookie?.().map((c) => c.split(";")[0]).join("; ");
  let j = null;
  try { j = await r.json(); } catch {}
  return { status: r.status, body: j, cookie: set, ms: performance.now() - t0 };
}

const login = await http("/api/auth/login", { method: "POST", body: { email: args.email, password: args.password } });
if (login.status !== 200) { console.error("login failed:", login.status, login.body); process.exit(1); }
const tc = login.cookie;

const open = await http(`/api/live/${CODE}`, { method: "POST", cookie: tc, body: { action: "open" } });
if (open.status !== 200) { console.error("could not open the session:", open.status, open.body); process.exit(1); }
const total = open.body.snap.slides; // a number: how many slides the session has
const list = (await http("/api/lessons", { cookie: tc })).body?.lessons ?? [];
const row = list.find((l) => l.code === CODE);
const lesson = row ? (await http(`/api/lessons/${row.id}`, { cookie: tc })).body?.lesson : null;
if (!lesson) { console.error("this lesson does not belong to that teacher"); process.exit(1); }
console.log(`session ${CODE} open, ${total} slides, ${N} students`);

/** a random answer of the right shape for the challenge on slide `at` (slides: arena, then explain/challenge/reveal per station, then the boss round) */
function randomAnswer(at) {
  const n = lesson.stations.length;
  if (at === 3 * n + 1) return { kind: "boss", values: lesson.boss.map(() => Math.random() < 0.5) };
  const c = lesson.stations[(at - 2) / 3].challenge;
  if (c.kind === "mcq") return { kind: "mcq", choice: Math.floor(Math.random() * 4) };
  if (c.kind === "tf") return { kind: "tf", value: Math.random() < 0.5 };
  if (c.kind === "dnd") return { kind: "dnd", placed: c.slots.map((x) => x.card).sort(() => Math.random() - 0.5) };
  return { kind: "match", links: c.pairs.map((_, i) => i).sort(() => Math.random() - 0.5) };
}
const isChallenge = (at) => at === 3 * lesson.stations.length + 1 || (at >= 2 && at < 3 * lesson.stations.length + 1 && (at - 2) % 3 === 0);

/* the students join one after another, as a class would at the start of the lesson */
const students = [];
const joinMs = [];
let errors = 0;
for (let i = 0; i < N; i++) {
  const r = await http(`/api/live/${CODE}`, { method: "POST", body: { action: "join", name: `طالب${i + 1}`, ref: `load-test-ref-${String(i).padStart(4, "0")}` } });
  joinMs.push(r.ms);
  if (r.status !== 200) { errors++; continue; }
  students.push({ sid: r.body.sid, i, seenAt: new Map(), events: 0 });
}
console.log(`joined ${students.length}/${N}; join latency p50 ${Math.round(pct(joinMs, 50))} ms, p95 ${Math.round(pct(joinMs, 95))} ms`);

/* every student device holds an event stream; we note when each one sees each slide */
const ctrl = new AbortController();
const streams = students.map(async (s) => {
  try {
    const res = await fetch(`${B}/api/live/${CODE}/events?role=student&sid=${encodeURIComponent(s.sid)}`, { signal: ctrl.signal });
    if (res.status !== 200) { errors++; return; }
    const dec = new TextDecoder();
    let buf = "";
    for await (const chunk of res.body) {
      buf += dec.decode(chunk);
      let k;
      while ((k = buf.indexOf("\n\n")) !== -1) {
        const m = buf.slice(0, k);
        buf = buf.slice(k + 2);
        if (!m.startsWith("data: ")) continue;
        const ev = JSON.parse(m.slice(6));
        s.events++;
        const at = ev.at;
        if (at !== undefined && !s.seenAt.has(at)) s.seenAt.set(at, performance.now());
      }
    }
  } catch (e) {
    if (e.name !== "AbortError") errors++;
  }
});
await sleep(800);

/* the teacher moves through the lesson; students answer every challenge a moment after it appears */
const seenErr = new Set();
const follow = [];
const answerMs = [];
await http(`/api/live/${CODE}`, { method: "POST", cookie: tc, body: { action: "goto", at: 0 } });
for (let at = 1; at < total; at++) {
  const t0 = performance.now();
  const g = await http(`/api/live/${CODE}`, { method: "POST", cookie: tc, body: { action: "goto", at } });
  if (g.status !== 200) { errors++; continue; }
  await sleep(300);
  for (const s of students) if (s.seenAt.has(at)) follow.push(s.seenAt.get(at) - t0);
  if (isChallenge(at)) {
    await Promise.all(
      students.map(async (s) => {
        await sleep(Math.random() * 600);
        const r = await http(`/api/live/${CODE}`, { method: "POST", body: { action: "answer", sid: s.sid, slide: at, answer: randomAnswer(at) } });
        answerMs.push(r.ms);
        if (r.status !== 200) { errors++; if (!seenErr.has(`${at}:${r.status}`)) { seenErr.add(`${at}:${r.status}`); console.log(`  answer on slide ${at} refused: ${r.status} ${r.body?.error ?? ""}`); } }
      }),
    );
  }
  await sleep(DWELL);
}

await http(`/api/live/${CODE}`, { method: "POST", cookie: tc, body: { action: "end" } });
ctrl.abort();
await Promise.allSettled(streams);

const evs = students.map((s) => s.events);
console.log("--- result");
console.log(`students connected          ${students.length}/${N}`);
console.log(`teacher -> student delivery  p50 ${Math.round(pct(follow, 50))} ms, p95 ${Math.round(pct(follow, 95))} ms, max ${Math.round(Math.max(...follow, 0))} ms (${follow.length} samples)`);
console.log(`answer request latency       p50 ${Math.round(pct(answerMs, 50))} ms, p95 ${Math.round(pct(answerMs, 95))} ms (${answerMs.length} answers)`);
console.log(`events per student           min ${Math.min(...evs)}, max ${Math.max(...evs)}`);
console.log(`errors                       ${errors}`);
const ok = students.length === N && errors === 0 && pct(follow, 95) < 2000;
console.log(ok ? "PASS (everyone connected, no errors, p95 delivery under 2 s)" : "FAIL");
process.exit(ok ? 0 : 1);
