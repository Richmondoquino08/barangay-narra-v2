# API Routes Documentation

## Authentication
- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Returns: JWT token and user profile

- `POST /api/auth/register`
  - Protected: admin
  - Body: `{ name, email, password, role }`

- `GET /api/auth/me`
  - Returns current user profile

## Resident Management
- `GET /api/residents`
  - List residents
- `GET /api/residents/search?q=...&household=...`
  - Search residents
- `GET /api/residents/:id`
  - Resident profile
- `POST /api/residents`
  - Create resident with optional `photo` file upload
- `PUT /api/residents/:id`
  - Update resident
- `DELETE /api/residents/:id`
  - Remove resident

## Certificate Requests
- `GET /api/requests`
  - List requests
- `POST /api/requests`
  - Create request with `{ resident_id, type, purpose }`
- `PUT /api/requests/:id/status`
  - Update status with `{ status }`
- `GET /api/requests/:id/pdf`
  - Export request template as PDF/html
- `GET /api/requests/:id/qr`
  - Generate QR code payload

## Finance
- `GET /api/finance/summary`
  - Daily and total collection summary
- `GET /api/finance/history`
  - Payment history
- `POST /api/finance/payment`
  - Record payment
- `POST /api/finance/settings`
  - Save pricing configuration

## Announcements
- `GET /api/announcements`
  - List announcements
- `POST /api/announcements`
  - Create announcement
- `PUT /api/announcements/:id`
  - Edit announcement
- `DELETE /api/announcements/:id`
  - Remove announcement

## Blotter
- `GET /api/blotter`
  - List incident records
- `POST /api/blotter`
  - Create blotter record
- `PUT /api/blotter/:id`
  - Update record
- `DELETE /api/blotter/:id`
  - Delete record

## Document Management
- `GET /api/documents`
  - List uploaded documents
- `POST /api/documents/upload`
  - Upload document file with `resident_id` and `description`
- `DELETE /api/documents/:id`
  - Remove document entry

## Settings
- `GET /api/settings`
  - Get barangay profile settings
- `POST /api/settings`
  - Save barangay profile and officials

## Audit Logs
- `GET /api/audit`
  - Get audit trail (admin only)
- `GET /api/audit/history`
  - Get login history (admin only)
