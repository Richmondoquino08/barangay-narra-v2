# GitHub Deployment Guide

Complete step-by-step guide to deploy the Barangay Management System from GitHub to your Orange Pi Zero 3 or any Ubuntu/Debian server.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [GitHub Repository Setup](#github-repository-setup)
3. [Server Preparation](#server-preparation)
4. [Cloning from GitHub](#cloning-from-github)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Installation & Build](#installation--build)
8. [PM2 Configuration](#pm2-configuration)
9. [Nginx Setup](#nginx-setup)
10. [Starting Services](#starting-services)
11. [Verification & Monitoring](#verification--monitoring)
12. [Updating from GitHub](#updating-from-github)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Ensure your server has the following installed:

### Required Software
- **Ubuntu Server 20.04+** or **Debian-based Armbian** (for Orange Pi Zero 3)
- **Node.js 20+** (ARM64 compatible)
- **PostgreSQL 14+** or MySQL 8+
- **Nginx** (Reverse proxy)
- **PM2** (Process manager)
- **Git** (for cloning repository)
- **sudo** access (for system commands)

### Installation Commands

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL (if not already installed)
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Verify installations
node --version
npm --version
psql --version
nginx -v
```

### Network Configuration (Optional)

If using Orange Pi Zero 3, configure static IP:

```bash
sudo nano /etc/netplan/01-netcfg.yaml
```

Example configuration:
```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses: [192.168.1.50/24]
      gateway4: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
```

Apply changes:
```bash
sudo netplan apply
```

---

## GitHub Repository Setup

### 1. Create GitHub Repository (One-time Setup)

If you haven't created the repository yet:

```bash
# Initialize git in your local project directory
cd /path/to/your/project
git init
git add .
git commit -m "Initial commit: Barangay Management System"

# Create repository on GitHub and link it
git remote add origin https://github.com/YOUR_USERNAME/barangay-management-system.git
git branch -M main
git push -u origin main
```

### 2. Add SSH Key to Server (Recommended for Automation)

For password-less git operations:

```bash
# Generate SSH key on the server
ssh-keygen -t ed25519 -C "your_email@example.com" -N ""

# Display the public key
cat ~/.ssh/id_ed25519.pub

# Copy the output and add it to GitHub:
# GitHub Settings → SSH and GPG keys → New SSH key
# https://github.com/settings/ssh/new
```

---

## Server Preparation

### 1. Create Application Directory

```bash
# Create directory for the application
sudo mkdir -p /var/www/barangay
sudo chown -R $USER:$USER /var/www/barangay
cd /var/www/barangay
```

### 2. Set Proper Permissions

```bash
# Allow the application to write to upload directories
sudo chmod 755 /var/www/barangay
sudo chmod 755 /var/www/barangay/backend/uploads
sudo chmod 755 /var/www/barangay/backend/uploads/documents
sudo chmod 755 /var/www/barangay/backend/uploads/profiles
```

---

## Cloning from GitHub

### 1. Clone the Repository

```bash
# Using HTTPS (simpler, but requires password each time)
cd /var/www/barangay
git clone https://github.com/YOUR_USERNAME/barangay-management-system.git .

# OR using SSH (recommended)
git clone git@github.com:YOUR_USERNAME/barangay-management-system.git .

# Verify clone was successful
ls -la
```

### 2. Verify Directory Structure

```bash
# Check that all folders are present
ls -la backend frontend db nginx pm2 docs
```

---

## Environment Configuration

### 1. Create Backend .env File

```bash
cd /var/www/barangay/backend

# Create environment file
cat > .env << EOF
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=barangay_db
DB_USER=barangay_user
DB_PASSWORD=your_secure_password_here

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# File Upload
MAX_UPLOAD_SIZE=52428800
UPLOAD_DIR=./uploads

# Application
APP_URL=http://192.168.1.50:3000
FRONTEND_URL=http://barangay.local

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Logging
LOG_LEVEL=info
EOF
```

### 2. Update Environment Values

Edit the `.env` file with your actual values:

```bash
nano .env
```

Key values to update:
- **DB_PASSWORD**: Generate a strong password
- **JWT_SECRET**: Generate a random string (`openssl rand -base64 32`)
- **APP_URL**: Your server's IP or domain
- **FRONTEND_URL**: Your frontend URL or domain

### 3. Create Frontend .env File (if needed)

```bash
cd /var/www/barangay/frontend

cat > .env << EOF
VITE_API_BASE_URL=http://192.168.1.50:3000
VITE_APP_NAME=Barangay Management System
EOF
```

---

## Database Setup

### 1. Create PostgreSQL Database and User

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE barangay_db;
CREATE USER barangay_user WITH PASSWORD 'your_secure_password_here';
ALTER ROLE barangay_user SET client_encoding TO 'utf8';
ALTER ROLE barangay_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE barangay_user SET default_transaction_deferrable TO on;
ALTER ROLE barangay_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE barangay_db TO barangay_user;

# Exit PostgreSQL
\q
```

### 2. Initialize Database Schema

```bash
# Run the initialization script
psql "postgresql://barangay_user:your_secure_password_here@localhost:5432/barangay_db" \
  -f /var/www/barangay/db/init.sql
```

### 3. Verify Database Creation

```bash
# Test database connection
psql -h localhost -U barangay_user -d barangay_db -c "\dt"

# Should list all tables created from init.sql
```

---

## Installation & Build

### 1. Install Backend Dependencies

```bash
cd /var/www/barangay/backend
npm install
```

### 2. Install Frontend Dependencies

```bash
cd /var/www/barangay/frontend
npm install
```

### 3. Build Frontend for Production

```bash
cd /var/www/barangay/frontend
npm run build

# Verify build was successful
ls -la dist/
```

### 4. Test Backend Start

```bash
cd /var/www/barangay/backend
npm start

# You should see: "Server running on port 3000"
# Press Ctrl+C to stop
```

---

## PM2 Configuration

### 1. Install PM2 Globally

```bash
sudo npm install -g pm2
```

### 2. Start Application with PM2

```bash
cd /var/www/barangay

# Using ecosystem config file
pm2 start pm2/ecosystem.config.js --env production

# Or manually start
pm2 start backend/app.js --name "barangay-backend"
```

### 3. Enable PM2 to Start on Boot

```bash
# Save current PM2 configuration
pm2 save

# Generate startup script
pm2 startup systemd -u $USER --hp /home/$USER

# Run the command shown in the output to enable auto-start
```

### 4. Verify PM2 Status

```bash
# List running processes
pm2 list

# View logs
pm2 logs barangay-backend

# View detailed status
pm2 info barangay-backend
```

---

## Nginx Setup

### 1. Copy Nginx Configuration

```bash
# Copy the example config
sudo cp /var/www/barangay/nginx/barangay.local.conf /etc/nginx/sites-available/barangay

# Create symlink to enable the site
sudo ln -s /etc/nginx/sites-available/barangay /etc/nginx/sites-enabled/

# Disable default Nginx site (optional)
sudo rm /etc/nginx/sites-enabled/default
```

### 2. Update Nginx Configuration

Edit the configuration to match your setup:

```bash
sudo nano /etc/nginx/sites-available/barangay
```

Key configurations to update:
- Replace `barangay.local` with your domain
- Update backend server address if not `localhost:3000`
- Update frontend path if not using PM2 serving

Example configuration:
```nginx
server {
    listen 80;
    server_name barangay.local 192.168.1.50;

    # Frontend static files
    location / {
        root /var/www/barangay/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Test Nginx Configuration

```bash
# Test syntax
sudo nginx -t

# Should show: "nginx: configuration file test is successful"
```

### 4. Reload Nginx

```bash
# Reload Nginx to apply changes
sudo systemctl reload nginx

# Verify Nginx is running
sudo systemctl status nginx
```

---

## Starting Services

### 1. Start All Services in Order

```bash
# 1. Verify PostgreSQL is running
sudo systemctl status postgresql

# 2. Start backend with PM2 (if not auto-started)
pm2 start pm2/ecosystem.config.js --env production

# 3. Verify Nginx is running
sudo systemctl status nginx
```

### 2. Check Service Status

```bash
# Backend
pm2 status

# Frontend (check via browser)
curl http://localhost:80

# Database
sudo -u postgres psql -c "SELECT version();"
```

---

## Verification & Monitoring

### 1. Test Backend API

```bash
# Test health endpoint (or any public endpoint)
curl http://localhost:3000/api/health

# Or with full server URL
curl http://192.168.1.50:3000/api/health
```

### 2. Access Application

Open a browser and navigate to:
- **Direct Backend**: `http://192.168.1.50:3000`
- **Via Nginx**: `http://192.168.1.50` or `http://barangay.local`

### 3. Monitor Logs

```bash
# Backend logs (real-time)
pm2 logs barangay-backend

# Nginx error logs
sudo tail -f /var/nginx/error.log

# PostgreSQL logs (if needed)
sudo journalctl -u postgresql -f
```

### 4. Monitor System Resources

```bash
# View PM2 monitoring dashboard
pm2 monit

# View system resources
top -u $USER
free -h
df -h
```

---

## Updating from GitHub

### 1. Pull Latest Changes

```bash
cd /var/www/barangay

# Fetch latest changes
git fetch origin

# Pull updates
git pull origin main
```

### 2. Install New Dependencies (if added)

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 3. Rebuild Frontend (if frontend changed)

```bash
cd /var/www/barangay/frontend
npm run build
```

### 4. Restart Services

```bash
cd /var/www/barangay

# Reload Nginx (for frontend)
sudo systemctl reload nginx

# Restart backend
pm2 restart barangay-backend

# View status
pm2 status
```

### 5. Database Migration (if schema changed)

```bash
# If db/init.sql was updated, run migrations or re-initialize
# (Make sure to backup first!)
sudo cp /var/www/barangay/db/init.sql /var/www/barangay/db/init.sql.backup

# Then run:
psql "postgresql://barangay_user:password@localhost:5432/barangay_db" \
  -f /var/www/barangay/db/init.sql
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check PM2 logs
pm2 logs barangay-backend

# Check Node.js version compatibility
node --version

# Verify .env file exists
cat backend/.env

# Check database connection
npm run test:db  # if available
```

### Database Connection Error

```bash
# Verify PostgreSQL is running
sudo systemctl status postgresql

# Test connection manually
psql -h localhost -U barangay_user -d barangay_db -c "SELECT 1"

# Check .env database credentials
cat backend/.env | grep DB_
```

### Frontend Not Loading

```bash
# Verify build exists
ls -la frontend/dist/

# Check Nginx configuration
sudo nginx -t

# View Nginx error logs
sudo tail -50 /var/log/nginx/error.log

# Check Nginx is running
sudo systemctl status nginx
```

### Permission Denied Errors

```bash
# Fix directory permissions
sudo chown -R $USER:$USER /var/www/barangay
chmod -R 755 /var/www/barangay

# Fix PM2 permissions
pm2 kill
pm2 start pm2/ecosystem.config.js --env production
```

### Port Already in Use

```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the process if needed
sudo kill -9 <PID>

# For Nginx port 80:
sudo lsof -i :80
```

### Git Clone Issues

```bash
# Fix SSH key permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519

# Test SSH connection
ssh -T git@github.com

# If HTTPS issues, clear cached credentials
git credential-cache flush
```

---

## CI/CD with GitHub Actions (Optional)

To automate deployments, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Server

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /var/www/barangay
            git pull origin main
            cd backend && npm install
            cd ../frontend && npm install && npm run build
            cd ..
            pm2 restart barangay-backend
```

Add these secrets to GitHub:
- `SERVER_HOST`: Your server IP/domain
- `SERVER_USER`: SSH username
- `SERVER_SSH_KEY`: Private SSH key

---

## Backup & Restore

### Backup Database

```bash
# Full backup
pg_dump -U barangay_user -d barangay_db > barangay_db_backup.sql

# Or use backup script
node backend/scripts/backup.js
```

### Restore Database

```bash
# Restore from SQL file
psql -U barangay_user -d barangay_db < barangay_db_backup.sql

# Or use restore script
node backend/scripts/restore.js
```

---

## Summary Checklist

- [ ] Server prerequisites installed
- [ ] GitHub repository created
- [ ] SSH key configured (optional but recommended)
- [ ] Repository cloned to `/var/www/barangay`
- [ ] `.env` files created with correct values
- [ ] PostgreSQL database and user created
- [ ] Database schema initialized
- [ ] Dependencies installed (`npm install`)
- [ ] Frontend built (`npm run build`)
- [ ] PM2 configured and started
- [ ] Nginx configured and reloaded
- [ ] Services verified running
- [ ] Application accessible via browser
- [ ] Logs monitored for errors

---

## Support

For issues or questions:
1. Check logs: `pm2 logs barangay-backend`
2. Review configuration: `cat backend/.env`
3. Test components individually
4. Consult [DEPLOYMENT.md](DEPLOYMENT.md) for additional details

