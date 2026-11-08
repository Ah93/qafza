// Inspect or clear the Firestore data this app writes.
//   node scripts/firestore-tool.mjs count          how many documents each collection holds, and who the users are
//   node scripts/firestore-tool.mjs wipe-test      delete ONLY accounts whose email ends in @example.com (and all their data)
// Reads credentials from .env.local like the app does.
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }),
);
const db = getFirestore(initializeApp({ credential: cert({ projectId: env.FIREBASE_PROJECT_ID, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") }) }));

const COLLECTIONS = ["users", "emails", "verifications", "lessons", "codes", "classes", "attempts", "progress", "mistakes", "usage", "tokens", "consents", "waitlist", "events", "reports", "sources", "invoices", "counters", "subscriptions", "_healthcheck"];
const cmd = process.argv[2];

async function deleteBy(collection, field, value) {
  const snap = await db.collection(collection).where(field, "==", value).get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const b = db.batch();
    snap.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
    await b.commit();
  }
  return snap.size;
}

if (cmd === "count") {
  for (const c of COLLECTIONS) console.log(c.padEnd(15), (await db.collection(c).count().get()).data().count);
  const u = await db.collection("users").select("email").get();
  const real = u.docs.map((d) => d.data().email).filter((e) => !e.endsWith("@example.com"));
  console.log("\nusers that are NOT @example.com:", real.length ? real.join(", ") : "none");
} else if (cmd === "wipe-test") {
  const users = await db.collection("users").select("email").get();
  let n = 0;
  for (const u of users.docs) {
    const email = u.data().email;
    if (!email.endsWith("@example.com")) { console.log("kept (not a test account):", email); continue; }
    const uid = u.id;
    const lessons = await db.collection("lessons").where("userId", "==", uid).select("code").get();
    for (const l of lessons.docs) {
      await deleteBy("attempts", "lessonId", l.id);
      await deleteBy("mistakes", "lessonId", l.id);
      await db.collection("codes").doc(l.data().code).delete();
      await l.ref.delete();
    }
    const classes = await db.collection("classes").where("userId", "==", uid).select("code").get();
    for (const c of classes.docs) { await db.collection("codes").doc(c.data().code).delete(); await db.recursiveDelete(c.ref); }
    await deleteBy("attempts", "studentUserId", uid);
    await deleteBy("mistakes", "userId", uid);
    await deleteBy("tokens", "userId", uid);
    await deleteBy("usage", "userId", uid);
    await deleteBy("events", "userId", uid);
    await deleteBy("invoices", "userId", uid);
    await deleteBy("sources", "userId", uid);
    await deleteBy("reports", "ownerId", uid);
    await db.collection("progress").doc(uid).delete();
    await db.collection("verifications").doc(uid).delete();
    await db.collection("subscriptions").doc(uid).delete();
    const { createHash } = await import("node:crypto");
    await db.collection("emails").doc(createHash("sha256").update(email).digest("hex").slice(0, 40)).delete();
    await u.ref.delete();
    n++;
  }
  // pending parent-consent requests of test children, and the approval links that point at them
  const pending = await db.collection("consents").select("email").get();
  let c = 0;
  for (const d of pending.docs) {
    if (!d.data().email.endsWith("@example.com")) continue;
    await deleteBy("tokens", "ref", d.id);
    await d.ref.delete();
    c++;
  }
  if (c) console.log(`removed ${c} pending consent request(s)`);
  // beta waitlist entries made by tests
  const wl = await db.collection("waitlist").select("email").get();
  for (const d of wl.docs) if (String(d.data().email).endsWith("@example.com")) await d.ref.delete();
  // with no invoices left, invoice numbering starts over (a real invoice would keep it going)
  if ((await db.collection("invoices").limit(1).get()).empty) for (const d of (await db.collection("counters").get()).docs) await d.ref.delete();
  await db.collection("_healthcheck").doc("ping").delete();
  console.log(`removed ${n} test account(s) and everything they owned`);
} else console.log("usage: count | wipe-test");
process.exit(0);
