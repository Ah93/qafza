// Finds calls to async data-layer functions that are not awaited: a missing await compiles fine and sends a Promise instead of data.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const NAMES = [
  "listLessons", "createLesson", "updateLessonData", "updateShare", "loadLesson", "patchLesson", "ownsLesson", "deleteLesson", "lessonsOfClass", "lessonRecord",
  "listClasses", "createClass", "ownsClass", "addStudents", "enrol", "classByCode", "updateClass", "deleteClass",
  "saveAttempt", "recordAttempt", "getProgress", "dueQuestions", "answerReview", "applyAttempt", "awardBadges", "openSession",
  "issueVerificationCode", "checkVerificationCode", "secondsUntilResend", "claimCode", "peekCode", "lookupCode", "releaseCode",
  "createUser", "getUser", "getUserByEmail", "updateUser", "deleteAccount", "exportAccount", "persist", "deleteWhere", "reassignWhere",
];
const call = new RegExp(`(?<![\\w.])(${NAMES.join("|")})\\(`, "g");
const SKIP = /^\s*(\/\/|\*|\/\*|import |export (async )?function |(async )?function )/;

function* files(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.tsx?$/.test(f)) yield p;
  }
}

let bad = 0;
for (const p of files("src")) {
  readFileSync(p, "utf8").split("\n").forEach((line, i) => {
    if (SKIP.test(line)) return;
    for (const m of line.matchAll(call)) {
      const before = line.slice(0, m.index);
      // awaited, returned (the caller awaits), or handed to Promise.all / a promise chain
      if (/\bawait\b/.test(before) || /\breturn\s*$/.test(before) || /Promise\.(all|allSettled)\(/.test(before) || /=>\s*$/.test(before)) continue;
      bad++;
      console.log(`${p.replaceAll("\\", "/")}:${i + 1}  ${line.trim().slice(0, 130)}`);
    }
  });
}
console.log(bad ? `\n${bad} call(s) to look at` : "every call is awaited");
