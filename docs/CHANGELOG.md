# Changelog

Tracks notable changes made to the system so they're easy to monitor and audit.
Newest entries first. Each entry lists what changed, why, and which files were touched.

---

## 2026-07-23 — New {{picture_signature_thumbmark}} tag; fixed Settings' stale header preview

**Why:** Two follow-up requests. First: Settings' "Report/Certificate Header Preview" card didn't reflect reality — it was a separately hand-coded mockup that never showed Province/City lines, never showed the right-side seal, and read from the wrong field (`address` instead of `province`/`city_municipality`) — nothing like the real certificate header. Second: wanted the resident's photo placed together with the signature and thumbprint boxes, proportionally, in the middle of the certificate, insertable as a tag.

**Settings header preview — fixed:** rewritten to mirror the actual header structure used by `certificatePrint.js`/`CertificateTemplateBuilder.jsx`: Republic → Province → City → Barangay Name → Office label, both seals, centered as one group, using `withLocationPrefix` for consistent formatting. It's a system-wide preview so it can't reflect per-template overrides (Logo Size/Gap/Text Size live per-template, not globally), but it now correctly reflects the settings that *are* global — province, city, both logos.

**New tag: `{{picture_signature_thumbmark}}`** — inserts the resident's photo, an empty signature box, and an empty thumbprint box as three equally-sized (6em), evenly-spaced, centered boxes — a matched set, unlike the old floated 2x2 photo which was a different size and stuck to the right margin. Falls back to an empty placeholder box when no photo is on file, so the layout is visible in the Template Builder even before generating a real certificate. Click it from the placeholder list like any other tag.

**Removed:** the certificate body's automatic, unconditional floated photo (shown whenever a resident had a photo on file, regardless of certificate type) — superseded by the new tag, which a template author places deliberately. Removing this also prevents the photo from appearing twice on templates that use the new tag.

**Bug fixed along the way:** `insertPlaceholder` (the function behind clicking a placeholder chip) appended every tag inline at the end of the body text with just a leading space. For block-level tags — `{{signature_thumbprint}}` and now `{{picture_signature_thumbmark}}` — appending inline after other text means the print renderer would wrap the whole line in a `<p>`, breaking it out of its intended position (a pre-existing risk in the code's own comments, now actually fixed instead of just documented). Both block tags now insert on their own line automatically when clicked.

**Files changed:** `frontend/src/pages/Settings.jsx`, `frontend/src/utils/certificatePrint.js`, `frontend/src/pages/CertificateTemplateBuilder.jsx`.

---

## 2026-07-23 — Fixed: Logo Gap control had no visible effect

**Why:** Reported immediately after the header layout controls above shipped — lowering "Logo Gap" wasn't visibly moving the logos closer to the text.

**Root cause:** the center text block was `flex:1` inside the header row — meaning it always stretched to fill 100% of the remaining row width, with its text centered *inside that stretched block*. Shrinking the gap only changed how much space the logos took at the very edges; the text, already centered within a full-width block, barely moved regardless of the gap value. The gap value was being applied correctly — it just had almost no visible effect on this layout.

**Fix:** removed `flex:1` from the text block and switched the row to `justify-content:center` — so the whole `[logo — text — logo]` group is now sized to its own content and centered as one unit within the header, with Logo Gap directly controlling the visible space between each logo and the text. Added `white-space:nowrap` to each header line so the now content-sized text block doesn't wrap awkwardly.

**Trade-off, not addressed:** an unusually long Province/City/Barangay name could now overflow instead of wrapping, since the text block no longer has a constrained width. Not a concern for normal-length PH barangay/city/province names, but flagging in case a template ever uses something unusually long.

**Files changed:** `frontend/src/pages/CertificateTemplateBuilder.jsx`, `frontend/src/utils/certificatePrint.js`.

---

## 2026-07-23 — Certificate header layout is now tunable per template (no more hardcoded guesses)

**Why:** After the previous letterhead size bump, a screenshot of a real generated certificate (with arrows drawn on it) showed the logos were still too far from the center text for this barangay's taste. Rather than keep guessing new hardcoded numbers from photos, added direct controls so any template can be tuned exactly as wanted.

**New controls, in the Template Builder's Header tab:**
- **Logo Size** (pt) — both seals, was fixed at 76pt
- **Logo Gap** (pt) — space between each logo and the center text block, was fixed at 8pt; this is the one to lower to bring the seals in closer
- **Header Text** (pt) — Republic/Province/City/Office-label lines, was fixed at 10.5pt
- **Barangay Name** (pt) — was fixed at 16pt
- **Title Size** (pt) — the certificate title (e.g. "BARANGAY CLEARANCE"), was fixed at 14pt

All five apply to both the actual print output and the on-screen Template Builder preview identically. Existing templates saved before this change have none of these fields in their stored config — confirmed this is fine, since every read falls back to the same defaults that were previously hardcoded (`logo_size ?? 76`, etc.), so nothing changes for templates nobody touches; the controls only do something once someone adjusts them.

**Files changed:** `frontend/src/pages/CertificateTemplateBuilder.jsx`, `frontend/src/utils/certificatePrint.js`, `frontend/src/pages/Certificates.jsx` (new template defaults).

---

## 2026-07-23 — Fixed the real cause of "uploaded logo disappears after we push to Debian"

**Why:** Reported as a recurring problem: the barangay/city logos in Settings would vanish after a deployment. Investigated instead of guessing, and found the actual cause — a real, serious bug, not a display issue.

**Root cause:** `.deploy/03_rsync_project.sh` syncs the whole project from this local dev machine to production using `rsync --delete`, which deletes anything on the production server that doesn't also exist locally. Barangay staff upload logos directly through the live Settings page on production — so those files exist **only on the production server**, never on this local machine. Every deploy for *any* unrelated feature was silently deleting them. Confirmed directly: production had two logo files timestamped from earlier this morning, owned by `root` (i.e. re-uploaded after a previous disappearance), that did not exist in the local copy at all — the very next deploy would have deleted them again.

**Fix:** added `--exclude 'backend/uploads'` to the rsync command, so the entire uploads tree (settings images, certificate template images, resident documents, reference docs) is now completely untouched by code deployments in either direction — verified with a dry run showing zero upload files affected.

**Resident photos specifically — checked, not actually at risk:** confirmed resident profile photos are stored as base64 data directly in the `residents.profile_image_url` database column (not as files on disk), so they were never exposed to this bug in the first place — they live in the database, synced through normal Postgres, not through the file-sync deploy. The exclude above still matters for logos, certificate template header images, and anything else that *is* stored as a file.

**Files changed:** `.deploy/03_rsync_project.sh`.

---

## 2026-07-23 — Certificate letterhead: bigger logos, tighter gap, bigger header text

**Why:** Requested visual adjustment based on a screenshot of the printed letterhead — logos too small and too far from the center text, header text (Republic/Province/City/Barangay Name/Office label) too small.

**Changed (both the actual print output and the on-screen Template Builder preview, kept in sync):**
- Logo size: 64pt → 76pt
- Gap between each logo and the center text block: 14pt → 8pt (print), 12px → 7px (preview)
- Republic/Province/City lines: 9pt → 10.5pt
- Barangay name: 14pt → 16pt (print), 13px → 15px (preview)
- "Office of the Punong Barangay": 9pt → 10.5pt

**Files changed:** `frontend/src/utils/certificatePrint.js`, `frontend/src/pages/CertificateTemplateBuilder.jsx`.

---

## 2026-07-23 — Resident photo on certificates: already implemented, verified working

**Why:** Asked whether residents could have their uploaded photo appear on certificates. Checked the code before building anything new — this already exists: whenever a resident has a photo on file (`profile_image_url`), certificate printing automatically shows it as a bordered "2x2 PHOTO" box floated in the certificate body, for every certificate type, no per-template toggle needed. `Certificates.jsx`'s `buildPrintData()` already pulls the resident's photo into the print data, and `certificatePrint.js` already renders it.

**Verified:** confirmed a resident with a real uploaded photo has a valid `data:image/jpeg;base64,...` value in `profile_image_url` (48KB), and traced the render path — the photo is embedded directly in the printed HTML as a data URI, so it doesn't depend on any file being reachable (immune to the deploy issue above, and to the earlier CDN/popup issue that used to make the QR code disappear). No code changes needed — if it's not showing for a specific resident, the resident simply doesn't have a photo uploaded on their Residents record yet.

---

## 2026-07-22 — Cheque preview: all reference lines/boxes now move with their field

**Why:** Following up on the date-box fix above — same idea extended to every other field. Previously only the date boxes moved together with their digits; the payee underline, amount box, "PESOS" underline, and the two signature boxes were all independently fixed positions that a Layout Editor adjustment could leave behind, making the preview inconsistent once anyone actually tuned a field.

**What changed:** each pre-printed reference element's position is now computed as an offset from its data field instead of a separate hardcoded number — payee line = `f.payee.top + 3`, amount box = `f.amountNum.top - 5` (and `left - 3`), pesos line = `f.amountWords.top + 2`, signature boxes = `f.signer1/2.top - 18` (and matching `left`). All offsets were derived from the previous fixed values, so the defaults render identically to before — this only changes what happens when a field is *moved*: its line/box now moves with it.

**Files changed:** `frontend/src/pages/ChequePrint.jsx`.

---

## 2026-07-22 — Cheque print preview: date digits floating off their boxes, amount box overlapping PESOS

**Why:** After the calibration fix above, a screenshot of the actual preview showed two more real bugs — the typed date digits (e.g. "07222026") rendered floating above and to the side of their pre-printed boxes instead of inside them, and the amount box was tall enough to visually overlap the "PESOS" label and "Amount in words" line below it.

**Date digits floating — root cause:** the pre-printed decorative date boxes and the actual typed digits were two *independent* absolutely-positioned elements (the boxes fixed at `top:21%, left:63%W`; the digits driven separately by `f.date.top/left`, defaulted to `18%/67%`). They were never mathematically tied together — keeping them visually aligned depended on both sets of numbers happening to agree, which they didn't. Fixed by merging them into a single positioned container: the "DATE" label, the pre-printed boxes, and the digits now all live inside one `<div>` positioned by `f.date.top/left`, using the exact same per-digit offsets for both the boxes and the digits. They're now aligned by construction — no combination of tuning values can make them drift apart again. Default position updated to `top:21, left:63` (previously `18/67`) to match where the box row visually sits.

**Amount box overlap — root cause:** the box's height (`chequeHeight × 0.15`, i.e. 15% of the cheque's height) plus the "P" label sitting above it pushed the box down to roughly 33%–48% of the cheque's height, while "PESOS" was fixed at 42% — a real, visible overlap, not something introduced by the sizing fix above (same numbers were already there before today). Reduced the box height to 7% of cheque height (33%–40%), clearing "PESOS" by about 2%. The box's width still reflects the measured 5cm from the earlier fix.

**Files changed:** `frontend/src/pages/ChequePrint.jsx`.

---

## 2026-07-22 — Cheque print calibration: correct size + a real units bug

**Why:** Reported as "the printed cheque doesn't match the actual cheque," with a photo of the physical Landbank cheque annotated with measurements (8"×3" overall, not the 8.5"×3.5" the system assumed; date box row 4.5cm wide; amount box 5cm wide; two signature boxes 4.5cm wide × 1cm tall with a 0.5cm gap between them).

**Root cause #1 — wrong physical size:** `DEFAULT_LAYOUT` assumed a generic 8.5"×3.5" checkbook cheque. The actual cheque is 8"×3". Every position on the page is computed as a percentage of these dimensions, so this alone was enough to throw off every field.

**Root cause #2 — preview and print used different units for the same numbers, silently.** This is the more important one: a value like `fontSize: 11` or a box-offset of `13` meant "11/13 CSS pixels" in the on-screen preview but "11/13 points (1/72 inch)" in the actual print output — a fixed ~33% size difference between what you saw on screen and what came out of the printer, for every field position and font size. Fixed by adding a `ptTrue()` conversion (real points → CSS pixels) used specifically for the values that are shared between preview and print (field font sizes, date-box geometry) — verified numerically afterward that preview and print positions now agree to the sub-thousandth of an inch. Purely cosmetic mockup elements (labels, dividers, the barcode graphic — none of which are ever actually printed) were deliberately left on the old scale-only unit, so the preview's overall look doesn't change.

**Date box spacing is now tunable** instead of a hardcoded offset table (`[0, 11, 26, 37, 52, 63, 74, 85]`) — this was flagged as "the one that's hard to set up." New **Date Digit Spacing** panel in the Layout Editor tab exposes 4 numbers: Box Width, Digit Gap (between two digits in the same group, e.g. the two M's), Group Gap (the wider gap where a "/" sits), and Box Height — all in points. Both the preview and the print output are driven by the same `computeDateOffsets()` function, so a change here is guaranteed to apply identically to both.

**Applied the provided measurements:** amount box width (5cm → 24.6% of the new 8" width, was 27%), the two signature boxes (4.5cm wide × 1cm tall each, 0.5cm gap → 22.15% / 13.1% / 2.46%, was 20%/20%/23%-gap), and default date-box spacing scaled to land within 0.1cm of the measured 4.5cm total width.

**Not fixed / needs verification:** two vertical distance annotations on the photo ("1.2cm" near the check number, "2.1cm" near the bottom) had an ambiguous reference point I couldn't confidently place from the photo alone — left the existing top-position defaults unchanged rather than guess. Recommend the usual light-table calibration (print on plain paper, hold over the real cheque, nudge Top%/Left% in the Layout Editor) for final positioning — but that process should now actually work, since preview and print no longer disagree on scale.

**Files changed:** `frontend/src/pages/ChequePrint.jsx`. Also bumped the layout's localStorage key (`v4` → `v5`) so anyone with a previously-saved layout gets the corrected defaults instead of the stale 8.5×3.5in ones.

---

## 2026-07-22 — Bug fix: garbled peso signs and special characters (mojibake) across the app

**Why:** Reported as "why does the peso sign show as â‚±150,000.00 on Projects" — a screenshot of the Projects page's Total Budget tile. Investigation found this wasn't a display/rendering issue but literal corrupted bytes committed into the source code: several special characters (₱ peso, — em dash, – en dash, … ellipsis, − minus sign, · middle dot, plus a few emoji like ⚠️/✏️ and the ✓/× symbols) had been saved somewhere along the way as UTF-8 text that was first misread as Windows-1252 and re-saved — the classic "mojibake" double-encoding bug. Once corrupted this way, no browser or font can display it correctly; the actual character in the file is wrong.

**Scope:** affected 5 files — `Projects.jsx` (the reported bug: Budget/Amount Spent labels, the `fmt()` currency formatter, an insufficient-budget confirm dialog), `Reports.jsx` (every generated report — resident masterlists, income/expense/financial ledgers, blotter logbooks, certificates-issued — all had garbled peso signs and "—" placeholders for empty fields), `Settings.jsx` (Monthly Collection Target label, several toast/hint messages, a broken-image warning icon), `CertificateTemplateBuilder.jsx` (hint text, a placeholder-tag separator, Saving… button state), and `DRRM.jsx` (alert level dropdown labels, an incident response-action arrow icon). Also many code comments (section-divider box-drawing characters) were corrupted the same way — cosmetic only, but fixed alongside since the same tool caught them for free.

**Fix approach:** rather than hand-fixing each occurrence, wrote a script that reverses the exact corruption mechanically — for each suspicious character run, converts it back to the Windows-1252 byte values it was misread as, then decodes those bytes as UTF-8 to recover the original character. Applied across all of `frontend/src` and `backend`; only these 5 files had any corruption (confirmed by scanning all 165 source files). Every change was individually reviewed via `git diff` before committing — no false positives.

**Not fixed / out of scope:** this only repairs characters already baked into the source code. If corruption is reintroduced by whatever originally caused it (suspected: a copy-paste or file-save through a tool that assumed the wrong encoding), it would need to be re-run. No recurrence protection was added since the root cause of the *original* corruption event wasn't identified.

---

## 2026-07-22 — Bug fix: resident pickers only loaded the first 500 (of 2,316) residents

**Why:** Reported as "why can't I find some residents when adding a user" — turned out to be a real bug, not a search problem. Six pages load residents once into a plain array for their search/picker components, capped at a hardcoded page size (`residentsAPI.getAll(1, 500)` or `1000`). With 2,316 total residents in the database, ordered alphabetically by last name, anyone past roughly the 500th (or 1000th) name — e.g. most residents from "C" onward — was silently invisible to search in every one of these pickers. Typing their exact name did nothing because they were never loaded to begin with.

**Fix:** bumped the cap to 5000 (comfortably above the current 2,316 with room to grow) in all six places: `frontend/src/pages/Users.jsx`, `Certificates.jsx`, `BlotterManagement.jsx`, `Requests.jsx`, `SocialPrograms.jsx`. Verified directly against the API: the old limit returned 500/2316 residents (cutting off at "BALEJE"); the new limit returns all 2316 (through "ZULITA").

**Known limitation, not fixed:** this is a page-size bump, not a structural fix — it doesn't scale indefinitely. If the resident count grows much further (tens of thousands), these pages would need to switch from "load everything once, filter client-side" to live server-side search (the `GET /residents/search/query` endpoint already exists and is unused by these pickers). Not worth doing today at this data size.

---

## 2026-07-22 — Resident verification when creating/editing user accounts

**Why:** Follow-up to the resident-linked accounts feature above. Picking a resident from a search box with no further confirmation was too easy to get wrong, especially when two residents share the same name (found this firsthand — Ernesto Doncillo has an exact duplicate record). Added three low-effort safeguards instead of the bigger self-service identity-verification flow, which isn't warranted unless account-sharing/impersonation turns out to be a real concern.

**What changed:**
- **Confirmation card** — after picking a resident in the New/Edit User form, a card now shows their birthdate/age, civil status, address + purok, and contact number, so the admin can visually double-check before saving instead of trusting a one-line search result.
- **Duplicate-name warning** — `ResidentSearch` (shared by Users and Certificates) now flags residents who share an exact full name with someone else, both as a small badge in the dropdown and as a warning line once selected ("N other residents share this name — double-check..."). Benefits certificate generation too, not just user creation.
- **Audit log entry** — linking or re-linking a resident to a user account now writes a `link_resident_to_user` entry (who did it, which account, which resident) via the existing audit log. Only logs on an actual change, not on every save.

**Files changed:** `frontend/src/components/ResidentSearch.jsx`, `frontend/src/pages/Users.jsx`, `backend/controllers/usersController.js`.

**Not built (discussed, intentionally deferred):** a self-service "claim your account" flow where the resident completes their own registration via a link sent to their on-file contact info, instead of the admin setting a password directly. Bigger feature (needs SMS/email delivery), only worth it if the confirmation-card + audit-log combination above turns out to be insufficient in practice.

---

## 2026-07-22 — Resident-linked staff accounts, Intern/Guest role, resident-style My Profile

**Why:** Staff accounts should represent real residents of the barangay (except the system admin account, which isn't necessarily a person who lives here), and the office wanted a way to give interns/temporary helpers system access that's view-only by default rather than either full access or none.

**Users are now linked to residents:**
- New `users.resident_id` column (nullable, unique when set) — every secretary/captain/treasurer/intern account must be linked to an existing resident record; admin accounts don't need one.
- `POST/PUT /api/users` now requires `resident_id` for any non-admin role, validates the resident exists, and rejects linking a resident that's already tied to another account (409).
- **The three real officials now have real accounts:** the placeholder logins (Maria Santos/secretary, Ana Cruz/treasurer, Jose Reyes/captain) were renamed and linked to their actual resident records — captain@barangay.gov.ph → ERNESTO DUMALAON DONCILLO (resident #1202), treasurer@barangay.gov.ph → FELIX TAN BALDAD JR. (#180), secretary@barangay.gov.ph → MARYROSE BAYRON OQUIÑO (#459). Emails and passwords unchanged. Migration: `backend/scripts/migrate25.js`.
- **Data-quality note, not fixed:** resident #1202 (Ernesto) has an exact duplicate at #1870 — same person, imported ~2 seconds apart, no certificates/documents attached to either. #1202 was picked as canonical since it's needed for the account link now. The duplicate at #1870 is still sitting in Residents and should be reviewed/merged manually.

**New "Intern" role — view-only by default:**
- New role alongside admin/secretary/captain/treasurer, for interns or temporary help. Can always view Residents, Certificates, Blotter, Announcements, Documents, Reports, and the certificate verification page — but cannot create/edit/approve/delete anything **unless** an admin turns on "Intern Write Access" in Settings → Access Control (off by default). This is a single global switch, not per-user.
- Enforced via a new `backend/middleware/internGuard.js` (`allowRoles`), swapped in as a drop-in replacement for `requireRole` on the route files above (`residents.js`, `certificates.js`, `blotter.js`, `requests.js`, `documents.js`, `announcement.js`). GET requests always pass for interns; everything else checks the new `system_settings.intern_write_access` column live.
- **Not yet covered:** Finance, procurement, projects, assets, social programs, DRRM, and officials routes still use the old `requireRole` directly, so interns can't see those modules at all yet regardless of the write-access toggle. Extending the same swap to those route files is a straightforward follow-up if interns need visibility there too.
- Frontend buttons for create/edit/delete are **not** individually hidden for interns when write-access is off — they're still visible, but submitting shows a clear "View-only access" toast from the blocked request. The backend is the actual enforcement boundary.

**My Profile now shows the real resident record for linked accounts:**
- `frontend/src/pages/Profile.jsx` rebuilt: if the logged-in account has a `resident_id`, it shows the same Personal Information / Certificates / Requests tabbed view as the staff-facing Resident Profile page, sourced live from the residents table — this is what "My Profile" now looks like for secretary/captain/treasurer/intern accounts. Admin (no resident link) still sees the simpler name/email editor from yesterday.

**Bugs found and fixed along the way (same `const [result] = await pool.query(...)` destructuring pattern flagged in the two previous entries):** confirmed and fixed in `usersController.deleteUser` and `usersController.resetPassword` — both had a 404 check on `result.affectedRows` that could never trigger, so deleting a non-existent user or resetting a non-existent user's password silently reported success either way. A grep across `backend/controllers` still shows this pattern in ~11 other spots (blotterController, financeController, requestController, residentController, and one more in certificatesController) — still not individually verified, same open item as before.

---

## 2026-07-22 — Self-service Profile / Change Password, top-bar redesign

**Why:** No way for a logged-in user to view/edit their own account or change their own password without admin help. The top-right user chip also showed the account's literal `full_name` value ("System Administrator" for the seed admin account) as a two-line name+role card — read as generic/impersonal rather than "this is you."

**Changed:**
- Top-bar user chip simplified to avatar + first name + chevron only (role now shown only inside the dropdown, not the button itself).
- Dropdown now has **My Profile** and **Change Password**, available to every role (previously only admin had a menu item — Settings — everyone else's dropdown was just Sign Out).
- New page `frontend/src/pages/Profile.jsx` — edit your own full name/email; view role, email, last login, member since (read-only). Reuses the existing `PUT /api/users/:id` endpoint, which already self-service-safely ignores role changes from non-admins.
- New page `frontend/src/pages/ChangePassword.jsx` — current/new/confirm form using the existing `POST /api/auth/change-password` endpoint.
- Fixed a mislabeled CSS class (`input-field`, which doesn't exist) on the certificate-verification page's search box from yesterday's QR feature — it was rendering unstyled; corrected to the real `.input` class.

**Bugs found and fixed along the way:** while testing the new create-user → login → self-update → change-password flow end to end, found the same `const [result] = await pool.query(INSERT...)` destructuring bug (see the 2026-07-22 trash and QR-verification entries) in **`usersController.createUser`** — the admin "add user" API response's `user.id` was silently `undefined`. Fixed the same way (`const [, result] = ...`). No visible symptom today since the Users page just reloads its list after creating a user rather than reading the id back, but confirmed broken via direct test before the fix.

**Scope note — this bug pattern is wider than these three spots.** A grep across `backend/controllers` for `const [result] = await (pool|db).query(` turns up **16 occurrences** (`authController.js`, `certificatesController.js` ×3, `blotterController.js`, `financeController.js` ×3, `announcementController.js`, `requestController.js`, `documentController.js`, `usersController.js` ×2, `residentController.js` ×3). Not all are necessarily broken — it only bites when the code afterward reads `result.affectedRows` or `result.insertId` — but each one needs individual verification. This is a systemic, pre-existing pattern, not something introduced this session. Recommend a dedicated pass to check and fix all of them rather than continuing to find them one at a time; out of scope for today's changes, not fixed beyond the three already listed.

---

## 2026-07-22 — Certificate verification (QR code)

**Why:** Certificates already print a QR code, but nothing on the system side ever reads it back — there was no way for staff to confirm a certificate someone hands in was actually issued by this office. Scoped to **internal/staff use only** (not a public-facing portal) since the system is Tailscale-only and not reachable from the outside anyway; a public verification page is a separate decision for later.

**How it works:**
- New page **Verify Certificate** (sidebar, under Records) lets staff type in the code printed under a certificate's QR (or the certificate ID) and see whether it's genuine. Supports scanning the QR directly via the device camera where the browser supports the native `BarcodeDetector` API (no new dependency added).
- If genuine: shows certificate type, resident, purpose, issue date, status, OR number.
- If the code matches something that was later deleted: reports that clearly ("deleted on `<date>` by `<name>`") instead of a bare "not found" — reuses the trash_bin data from the trash feature added the day before.
- If nothing matches at all: reported as not verified.

**Security fix (prerequisite):** the QR code's embedded value was previously `CERT-<timestamp>-<resident_id>` — guessable/constructible without ever seeing a real certificate, which would have made "verification" meaningless. Changed to `CERT-<16 random hex chars>` (`crypto.randomBytes`), looked up only by exact database match.

**Files added:** `frontend/src/pages/VerifyCertificate.jsx`.
**Files changed:** `backend/controllers/certificatesController.js` (QR generation + new `verifyCertificate` handler), `backend/routes/certificates.js` (`GET /certificates/verify/:code`, registered before the generic `/:id` route), `frontend/src/api/apiClient.js`, `frontend/src/App.jsx`, `frontend/src/components/Sidebar.jsx`, `frontend/src/contexts/ThemeContext.jsx`, `frontend/src/pages/Settings.jsx`, `frontend/src/layouts/AdminLayout.jsx`.

**Bug found and fixed along the way:** `generateCertificate` had the same `const [result] = await pool.query(INSERT...)` destructuring bug flagged in the trash feature entry below — `result` was actually the empty/`RETURNING id` rows array, not the `resultInfo` object, so the API response's `certificate.id` field was silently `undefined` on every single certificate generation (dropped entirely from the JSON response, since `JSON.stringify` omits `undefined` values). Confirmed via direct testing. No visible symptom in the current UI because the frontend doesn't read that field back — but it would have broken any future feature (like this one, initially) that needs the newly-created certificate's ID from the generate response. Fixed to `const [, result] = await pool.query(...)`. **Still not checked:** whether `approveCertificate`/`rejectCertificate` have the same bug — that remains an open item from the previous entry.

---

## 2026-07-22 — Trash / recycle bin feature

**Why:** Directly motivated by the certificate-deletion incident on 2026-07-20 — deletions were permanent with no recovery path. Adds a soft-delete system: normal users' deletions are recoverable, and only admin can truly purge data.

**Scope (phase 1):** Certificates and Documents only. Residents deferred — deleting a resident has cascading relationships (their certificates, documents, blotter cases) that need a deliberate policy decision before soft-delete can be applied there safely.

**How it works:**
- New `trash_bin` table stores a full JSON snapshot of anything deleted, rather than adding a `deleted_at` column to every table — this means none of the existing read/list queries across ~20 controllers needed to change, so there's no risk of a forgotten filter leaking trashed data back into normal views.
- Deleting a certificate or document now snapshots the row into `trash_bin` and removes it from the live table — for documents, the uploaded file is deliberately *not* removed from disk yet, so a restore can still serve it.
- Normal users see only their own deletions (`GET /api/trash/mine`) and can **Restore** or **Delete** (which only hides it from their own view — it is not actually purged, admin can still see and recover it).
- Admin sees everything (`GET /api/trash/all`, including items a user has "deleted" from their own trash) and can **Restore** or **Permanently Delete** (`DELETE /api/trash/:id`) — only admin can trigger a true, unrecoverable purge.
- Auto-purge: anything older than 30 days is automatically and permanently removed (file included, for documents) via an interval check in `app.js`, run on startup and every 6 hours.
- Delete/restore/permanent-delete actions all log through the existing audit log (`audit_logs` table) rather than a new logging system.

**Files added:** `backend/scripts/migrate24.js`, `backend/services/trashService.js`, `backend/controllers/trashController.js`, `backend/routes/trash.js`, `frontend/src/pages/Trash.jsx`.
**Files changed:** `backend/app.js` (route registration + auto-purge interval), `backend/controllers/certificatesController.js` and `backend/controllers/documentController.js` (delete now moves to trash instead of hard-deleting), `frontend/src/api/apiClient.js`, `frontend/src/App.jsx`, `frontend/src/components/Sidebar.jsx`, `frontend/src/contexts/ThemeContext.jsx`, `frontend/src/pages/Settings.jsx`, `frontend/src/layouts/AdminLayout.jsx` (routing, navigation, and Access Control integration).

**Bug found and fixed along the way:** discovered a real, pre-existing bug pattern while building this — code that does `const [result] = await pool.query(UPDATE/DELETE...)` and then checks `result.affectedRows` never actually works, because `db.query()` returns `[rows, resultInfo]` and `affectedRows` lives on the second element, not the first. This affected my own new `hideForUser` function (fixed). **Not yet checked:** whether this same pattern exists elsewhere in the codebase (e.g. `approveCertificate`, `rejectCertificate` both looked like they might have it) — worth a dedicated review, since it would mean some existing "not found" checks silently never trigger.

**Access control note:** certificate deletion is currently admin-only at the route level (`requireRole('admin')`); only document deletion is available to secretary. So for certificates specifically, trash mainly protects admin from their own accidental/mistaken deletions rather than "normal user deletes, admin recovers" — the trash mechanism still applies the same way, just worth knowing who can actually trigger it today.

---

## 2026-07-21 — Security hardening

### HSTS (Strict-Transport-Security) enabled
**Why:** Now that the site is served over a trusted HTTPS certificate, browsers should be told to always use HTTPS for this host and never silently fall back to plain HTTP.
**Changed:**
- `backend/app.js` — Helmet's `hsts` option switched from `false` to `{ maxAge: 31536000, includeSubDomains: true, preload: false }`.
- Production nginx config (`/etc/nginx/sites-available/barangay.conf` on the server) — added `add_header Strict-Transport-Security` directly, since nginx serves the frontend's static files itself (not proxied through the Node app), so the Helmet header alone wouldn't reach the initial page load.
- `preload` intentionally left off — that's an irreversible public-list submission meant for public domains, not appropriate for a private `.ts.net` hostname.

### File upload validation added to the Documents route
**Why:** `backend/routes/documents.js` had no file type or size restriction at all — any file, any size, could be uploaded (endpoint was still auth-gated to admin/secretary, but the gap remained). Every other upload route in the system already restricts type/size; this one didn't.
**Changed:**
- `backend/routes/documents.js` — added a 10MB size limit and a file type filter (PDF, DOC/DOCX, JPG/PNG), matching the validation pattern already used in `routes/residents.js` and `routes/refDocs.js`.

### Security review conducted
A full review against standard practices (OWASP-style) was done, covering authentication, authorization, transport security, input validation, headers, CORS, rate limiting, file uploads, secrets handling, and dependency vulnerabilities. Findings:

**Passing:** password hashing (bcrypt), parameterized SQL queries (no injection risk found), XSS escaping in certificate rendering, role-based access control, HTTPS, error responses not leaking stack traces in production, audit logging, per-user rate limiting, and the app not being exposed to the public internet at all (Tailscale-only).

**Still open / not yet addressed (flagged, not fixed):**
- `CORS_ORIGIN=*` combined with `credentials: true` — reflects any origin, which defeats CORS's cross-site protection. Needs to be restricted to the actual production hostname.
- Content-Security-Policy is disabled in Helmet (`contentSecurityPolicy: false`) — no defense-in-depth against XSS via resource-loading restrictions.
- JWT secret has a hardcoded fallback string in two files (`authController.js`, `middleware/auth.js`) if `.env` fails to load — same class of bug as the dotenv-path issue below.
- Login endpoint shares the same general rate limit as every other route (200 req/15min) rather than a stricter dedicated limit for brute-force protection.
- JWT tokens are valid for 7 days with no server-side revocation — a stolen token stays valid regardless of logout.
- `xlsx` (SheetJS) dependency has a known high-severity prototype pollution / ReDoS issue with no fix published upstream.
- Frontend has 7 npm audit findings (3 high, 3 moderate) — `form-data` and `react-router` both have fixes available via `npm audit fix`, not yet applied.
- DB password and JWT secret are hardcoded in plaintext inside `.deploy/05_backend_setup.sh`.

---

## 2026-07-20 — Production deployment infrastructure

### Fixed: rate limiter misidentifying all users as one client
**Why:** The backend sits behind nginx but had no `app.set('trust proxy', ...)`, so `express-rate-limit` couldn't see real client IPs — every user behind the reverse proxy shared a single rate-limit budget for the whole office. This was causing the dashboard to intermittently fail to load (requests silently hitting 429 and displaying as zeros).
**Changed:** `backend/app.js` — added `app.set('trust proxy', 1)`.

### Fixed: PM2 starting the backend on the wrong port
**Why:** The PM2 ecosystem config's `cwd` pointed at the repo root instead of `backend/`, so `dotenv.config()` couldn't find `.env` and the app silently fell back to its default port (5000 instead of 3000).
**Changed:** `.deploy/07_pm2_start.sh` — ecosystem config `cwd` corrected to `/opt/barangay-system/backend`, `script` updated to match.

### HTTPS set up for the first time
**Why:** Browser camera access (`getUserMedia`, used by "Take a Photo") requires a secure context — the site was HTTP-only.
**Changed:** nginx reconfigured for HTTPS on port 443 (HTTP redirects to HTTPS). Initially a self-signed certificate; later swapped for a real Let's Encrypt certificate once Tailscale's HTTPS Certificates + MagicDNS features were enabled on the tailnet. Daily cron job added for automatic cert renewal.

### Database migrations (3–23) applied to production
**Why:** Production's database was ~7 weeks behind local development and missing schema changes needed by the current code (expanded certificate types, `custom_fields` column, `status` constraint fix, and more).
**Verified:** No data loss — residents, users, and existing certificates were confirmed intact before and after.

### All 16 certificate templates synced to production
Templates created locally via the Template Builder (Barangay Clearance, Endorsement Letter, Permit to Transfer, and 13 others) were exported and imported into the production database.

---

## Certificate system (this session, prior to deployment)

Major feature work — 18 new certificate templates, visual template builder overhaul (header/watermark/signatory configuration), print renderer rewritten for paper-size compatibility (Letter/Legal/A4), server-generated QR codes replacing an unreliable CDN-based approach, resident-search-backed custom fields, date/time pickers for date-type fields, and signature/thumbprint boxes for "with Thumbmark" certificate types. See `frontend/src/pages/Certificates.jsx`, `frontend/src/pages/CertificateTemplateBuilder.jsx`, and `frontend/src/utils/certificatePrint.js` for the current implementation.
