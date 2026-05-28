# System Architecture

## Frontend
- React + Vite + Tailwind CSS
- Responsive admin dashboard
- JWT-based authentication with localStorage
- Browser routing using React Router
- API integration via Axios

## Backend
- Node.js + Express.js
- PostgreSQL database via `pg`
- Secure authentication using bcrypt and JWT
- File upload support using Multer
- Role-based access control with middleware
- Audit logging for create/edit/delete actions
- Lightweight PDF/QR endpoints suitable for low-power hardware

## Database
- PostgreSQL schema optimized for ARM64 low-memory operation
- Tables for users, residents, requests, payments, announcements, blotter, documents, system settings, and audit logs
- UUID primary keys
- Indexes on common query fields

## Deployment
- PM2 process manager to keep backend alive
- Nginx reverse proxy for HTTP routing and domain support
- Local file storage for uploads and backups
- Backup/restore scripts using `pg_dump` and `psql`
- Firewall rule examples for secure LAN access
