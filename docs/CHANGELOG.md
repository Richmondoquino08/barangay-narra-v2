# Changelog

Tracks notable changes made to the system so they're easy to monitor and audit.
Newest entries first. Each entry lists what changed, why, and which files were touched.

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
