# Barangay Narra Management System v2

A full-stack barangay management information system built with **React + Node.js + PostgreSQL**.

## Features

- **Resident Management** — CRUD, CSV export, senior/voter filters
- **Certificate Generation** — Barangay Clearance, Indigency, Residency, Business Permit
- **Service Requests** — full workflow: pending → approved → processing → completed
- **Blotter Records** — incident filing, investigation tracking, resolution
- **Finance** — income/expense tracking, CSV export, balance dashboard
- **Announcements** — post notifications that pop up for all logged-in users
- **Document Management** — file uploads linked to residents
- **User Management** — role-based access (Admin, Secretary, Captain, Treasurer)
- **Dark Mode** — full system-wide dark theme toggle per user
- **Settings** — logo upload, background image, login page customization

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, Lucide Icons |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken + bcryptjs) |

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Clone and install
\\ash
git clone https://github.com/YOUR_USERNAME/barangay-narra-v2.git
cd barangay-narra-v2
npm install
cd backend && npm install
cd ../frontend && npm install
\
### 2. Configure environment
\\ash
cp backend/.env.example backend/.env
# Edit backend/.env with your PostgreSQL credentials
\
### 3. Set up the database
\\ash
cd backend
node scripts/setup-db.js
\
### 4. Start development servers
\\ash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev -- --host 0.0.0.0
\
## Default Login

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@barangay.gov.ph | Admin@2024 |
| Secretary | secretary@barangay.gov.ph | Secretary@2024 |
| Captain | captain@barangay.gov.ph | Captain@2024 |
| Treasurer | treasurer@barangay.gov.ph | Treasurer@2024 |

## Project Structure

\barangay-system/
├── backend/           # Express API
│   ├── controllers/   # Business logic
│   ├── routes/        # API endpoints
│   ├── middleware/    # Auth, roles, error handling
│   ├── services/      # Audit logging
│   ├── scripts/       # DB setup & seeding
│   └── uploads/       # File storage (gitignored)
├── frontend/          # React app
│   └── src/
│       ├── components/ # Shared UI components
│       ├── contexts/   # Auth, Theme contexts
│       ├── layouts/    # AdminLayout
│       └── pages/      # Feature pages
└── db/
    └── init.sql       # PostgreSQL schema
\
## License
MIT
