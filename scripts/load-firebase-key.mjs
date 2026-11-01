// Copies the three Firebase service-account values from the downloaded JSON into .env.local.
// Usage: node scripts/load-firebase-key.mjs "<path to the downloaded .json>"
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createPrivateKey } from "node:crypto";

const file = process.argv[2];
if (!file) throw new Error("Pass the path of the downloaded service-account .json file.");
const k = JSON.parse(readFileSync(file, "utf8"));
for (const f of ["project_id", "client_email", "private_key"]) if (!k[f]) throw new Error(`The file has no ${f}.`);
createPrivateKey(k.private_key); // fails loudly here if the key is damaged

const path = ".env.local";
const keep = (existsSync(path) ? readFileSync(path, "utf8") : "").split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("FIREBASE_"));
keep.push(
  `FIREBASE_PROJECT_ID=${k.project_id}`,
  `FIREBASE_CLIENT_EMAIL=${k.client_email}`,
  // JSON.stringify keeps the line breaks as \n inside quotes, which is how .env files carry a multi-line key
  `FIREBASE_PRIVATE_KEY=${JSON.stringify(k.private_key)}`,
);
writeFileSync(path, keep.join("\n") + "\n");
console.log("Saved to .env.local:", keep.map((l) => l.split("=")[0]).filter((n) => n.startsWith("FIREBASE_")).join(", "));
