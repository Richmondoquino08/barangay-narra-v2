# Changelog

Tracks notable changes made to the system so they're easy to monitor and audit.
Newest entries first. Each entry lists what changed, why, and which files were touched.

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
