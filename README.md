# قفزة · Qafza

Turn any lesson material into a playable lesson. A teacher uploads a PDF, Word file, text or link; the app builds a lesson of five stations with a challenge after each, a boss round, points, ranks and badges; students join with a four-character code and play it. Arabic, right-to-left.

Built from the design in `ilmAI — Rebuilt Experience.pdf` (37 screens).

## Run it

Needs Node 20 or newer and a Firebase project with Firestore (Native mode).

```bash
npm install
cp .env.example .env.local     # then fill in the keys (see below)
npm run dev                    # http://localhost:3000
```

`npm run build && npm start` for production. `npx tsc --noEmit` and `npx eslint src` should both be clean.

### Database: Firestore

All data lives in Firestore and is only ever touched by server code (the browser never talks to Firestore), so the security rules can stay at **deny all**.

1. Firebase console → Project settings → Service accounts → **Generate new private key**.
2. `node scripts/load-firebase-key.mjs "<path to that .json>"` copies the three values into `.env.local` (checking the key first). Then delete the downloaded file.
3. No indexes are needed: every query is a single equality filter, sorted in memory.

`node scripts/firestore-tool.mjs count` shows what is stored; `wipe-test` removes only accounts whose email ends in `@example.com`. To work offline, set `FIRESTORE_EMULATOR_HOST` (and `FIREBASE_PROJECT_ID`) instead of the service account.

`node scripts/check-awaits.mjs` finds calls to the async data layer that are missing an `await`.

## What is real

| Area | State |
| --- | --- |
| Accounts | Sign-up, sign-in, sign-out, delete account, export my data. Passwords are hashed with scrypt; sessions are signed, httpOnly cookies. Sign-in and sign-up are rate limited. |
| Email | `src/lib/server/mail.ts` sends through [Resend](https://resend.com) over plain HTTPS when `RESEND_API_KEY` and `MAIL_FROM` are set, and prints the message to the server console when they are not (outside production the page also gets the code or link as a labelled test hint). Used for: the 6-digit sign-up code (stored hashed, 15 minutes, 5 tries), password reset (one-time link, 1 hour; resetting signs out every older session; the answer is identical for unknown addresses), and parent consent. In production `APP_URL` is required so the links in emails cannot be hijacked through the Host header. |
| Under-13 sign-ups | No account exists until a parent agrees. Sign-up stores only a pending request (a password hash, kept at most 7 days). The child names a parent; the parent gets a one-time link, reads what is stored, and agrees or refuses. Approving creates the account; the child then confirms their own email with a code. A request can email a parent at most 3 times. Age is computed from the full birth date. |
| AI lesson building | `POST /api/generate`. Reads PDF, DOCX, TXT/MD, pasted text or a web page, asks DeepSeek for a lesson, and validates the answer strictly before the app sees it (retrying up to three times). Every station cites a page of the source. |
| Links | Fetched on the server with SSRF protection (private and loopback addresses, other schemes and redirects into them are refused). Video links are not read; paste the transcript instead. |
| Saving | Lessons live in Firestore per account: edit, copy, archive, move to a folder, delete. Each has a four-character code. |
| Joining | `GET /api/join/[code]` is public, so a student on any device plays the teacher's real lesson. The teacher's "require sign-in" choice is enforced there, on the server. Archived and draft lessons are not served. |
| Classes | Class rosters, groups, join codes and per-student mastery live in Firestore. A lesson shared with a class enrols whoever plays it; mastery counts the first finished attempt per lesson only. |
| Live classroom | Real time. The teacher's screen and every student's phone follow one server-side session over server-sent events (`/api/live/[code]/events`); actions go through `POST /api/live/[code]`. The server judges answers, so students cannot see right or wrong before the teacher reveals, and points count only after the reveal. Results are saved when the teacher ends the session. The session lives in the memory of one Node process, so run a single server instance (see below). |
| Results and tracking | Built from stored attempts (`GET /api/lessons/[id]/report`): who finished, who is stuck, who never opened the lesson, per-station accuracy from the first try, the hardest challenge. |
| Students' progress | Signed-in students keep points, ranks, badges, cards and a daily streak in Firestore, and missed questions return in a spaced review (1, 3, 7, 14 days). Guests can play, but nothing is saved for them beyond the lesson's results. |
| Plans | **Lessons are open to everyone for now** (no limit, no paywall): set `PAYWALL_ENABLED=1` to bring back the rule below. With it on, a teacher gets 1 lesson free (counted for life; copying and AI building count, deleting does not give it back; taken atomically). After that a pass is needed: monthly (30 days) or school year (365 days), paid once and renewed by hand, which extends from the current end. Prices live in `src/lib/pricing.ts` and the server never trusts an amount from the browser. A 402 anywhere opens the paywall dialog. Students never pay. |
| Phones | Every page was checked for overflow at 390 and 360 px; the teacher and student areas have a bottom tab bar below tablet width. |

## What is still simulated or missing

- **Subscriptions are switched off** (`PAYWALL_ENABLED`), and there is **no real payment provider** yet: the free-lesson limit, price table, passes and checkout are real, but the only provider is a labelled test window (`BILLING_PROVIDER=test`, refused in production). Connect Moyasar, Tap or similar next; the seam is `src/lib/server/billing.ts`.
- **A mail provider key**: the email flows are built and tested, but nothing is delivered until you set `RESEND_API_KEY`, `MAIL_FROM` (a sender on a domain verified in Resend) and `APP_URL`.
- **Google / Microsoft / Apple sign-in** and **PowerPoint / video** sources.
- The sample lesson (code `7QK4`) is a rehearsal: its live session is scripted so a teacher can try the screens without students.

## Installable app, share previews, accessibility

- **App:** `src/app/manifest.ts` + icons from `/pwa-icon/{192,512,1024,512-maskable}` + `public/sw.js` (registered in production only). The service worker only gives an Arabic "no connection" page; it never caches lessons, scores or API calls.
- **Share previews:** `metadataBase` comes from `APP_URL` (or Vercel's production domain). `/join?code=XX` previews the lesson title; `/og/card` is the student's achievement card (no name in it). Images are drawn with Cairo Bold (`src/assets/cairo-700.woff`, SIL OFL), because Satori cannot read the tables of Readex or Noto Sans Arabic.
- **Font:** the site uses Readex Pro (free). The paid GE SS Two needs a web licence; with the files, replace `Readex_Pro` in `src/app/layout.tsx` with `next/font/local`.
- **Source passages:** `/api/generate` keeps the numbered source pages (collection `sources`, then the lesson's `sourcePages`). The "المصدر: صفحة N" badge opens the page with the matching sentence highlighted. Lessons built before this have no stored source and say so.
- **Report an error:** students/teachers on a lesson code send reports (`reports`); the owner sees them on the lesson page, the team at `/admin`.
- **Checks:** `npx axe` style runs are in the session scratchpad only; to re-check, run axe-core on the pages (the sheet of what was run is in the PR notes). Contrast tokens (`mint`, `teal-card`, `pink-card`, text opacities ≥ 70%) were darkened for 4.5:1.
- **Quality gates tooling:** `node scripts/load-test.mjs --email … --password … --code …` (35 simulated phones on one server) and `node scripts/quality-sheet.mjs` (CSV to score lessons 1-5 on five criteria).

## Running more than one server

Live sessions and the rate limiter are kept in process memory. On a host that runs one long-lived Node process this is fine. On serverless or multiple instances, move the live state to Firestore (or Redis) first, and make the host overwrite `x-forwarded-for` (the rate limiter trusts it).

## Layout

```
src/app/            pages and API routes (App Router)
src/app/api/        auth, generate, lessons, join
src/proxy.ts        redirects signed-out visitors to /login (the API routes do the real checks)
src/lib/server/     server-only code: Firestore access, auth, AI client, source extraction, lessons, classes, live sessions
src/lib/lesson*.ts  the lesson model and the validator for AI output
src/components/     teacher/, student/, auth/, gallery/
```

## Notes for whoever continues

- This Next.js version has breaking changes from older ones: read `node_modules/next/dist/docs/` before changing framework-level code (see `AGENTS.md`).
- The DeepSeek key is read only in `src/lib/server/deepseek.ts`. Never import server modules from client components; they start with `import "server-only"` to make that a build error.
- Email goes through `sendMail` in `src/lib/server/mail.ts`; templates are in the same file.
