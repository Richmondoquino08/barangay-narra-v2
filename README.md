# Barangay Management System

A full-stack barangay management platform built for lightweight ARM hardware such as the Orange Pi Zero 3.

## Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express.js
- Database: PostgreSQL
- Authentication: JWT
- Deployment: PM2 + Nginx

## Folder Structure
- `backend/` - Express backend server and local upload/backup utilities
- `frontend/` - React application
- `db/` - PostgreSQL initialization scripts
- `nginx/` - example Nginx reverse proxy config
- `pm2/` - PM2 startup configuration
- `docs/` - deployment, API docs, architecture guides

## Quickstart
1. Install dependencies in `backend/` and `frontend/`.
2. Create PostgreSQL database and run `/db/init.sql`.
3. Configure `.env` in `backend/`.
4. Start backend with PM2 and optionally build frontend.

## Deployment Documentation

Start with these guides in order:

1. **[GitHub Deployment Guide](docs/GITHUB_DEPLOYMENT.md)** ← **START HERE**
   - Complete step-by-step instructions to deploy from GitHub
   - Covers all prerequisites, setup, and configuration

2. **[Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md)**
   - Use this to verify everything is set up correctly
   - Pre-deployment, initial, and post-deployment checks

3. **[GitHub Deployment Quick Reference](docs/GITHUB_DEPLOYMENT_QUICK_REFERENCE.md)**
   - Quick commands for common tasks
   - Bookmarking this is recommended

4. **[GitHub Actions Setup](docs/GITHUB_ACTIONS_SETUP.md)** (Optional)
   - Automate deployments on every GitHub push
   - CI/CD pipeline configuration

### Other Documentation

- **[Full Deployment Guide](docs/DEPLOYMENT.md)** - Original Orange Pi Zero 3 deployment guide
- **[API Routes](docs/API_ROUTES.md)** - Available API endpoints
- **[Architecture](docs/ARCHITECTURE.md)** - System architecture overview
