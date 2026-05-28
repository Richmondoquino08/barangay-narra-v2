# Deployment Guide for Orange Pi Zero 3

## Overview
This project is designed to run on Ubuntu Server or Debian-based Armbian on Orange Pi Zero 3. It uses Node.js + Express for backend, React + Tailwind CSS for frontend, and PostgreSQL for database storage.

## Prerequisites
- Orange Pi Zero 3 with Ubuntu Server / Armbian installed
- Node.js 20+ (ARM64)
- PostgreSQL 14+ or compatible
- Nginx
- PM2

## Static IP Configuration
1. Edit `/etc/netplan/01-network-manager-all.yaml` or `/etc/network/interfaces` depending on your OS.
2. Example netplan config:

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
        addresses: [8.8.8.8,8.8.4.4]
```

3. Apply with:
```bash
sudo netplan apply
```

## Backend Setup
1. Install backend dependencies:
```bash
cd /root/backend
npm install
```
2. Copy `.env.example` to `.env` and update values:
```bash
cp .env.example .env
```
3. Create the PostgreSQL database and user:
```bash
sudo -u postgres psql
CREATE DATABASE barangay_db;
CREATE USER barangay_user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE barangay_db TO barangay_user;
\q
```
4. Initialize schema:
```bash
psql "postgresql://barangay_user:password@localhost:5432/barangay_db" -f /root/db/init.sql
```

## Frontend Setup
1. Install frontend dependencies:
```bash
cd /root/frontend
npm install
```
2. Optionally build for production:
```bash
npm run build
```

## Nginx Reverse Proxy
1. Copy the sample config:
```bash
sudo cp /root/nginx/barangay.local.conf /etc/nginx/sites-available/barangay.local
sudo ln -s /etc/nginx/sites-available/barangay.local /etc/nginx/sites-enabled/
```
2. Test and restart Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```
3. Access your app from LAN:
- `http://192.168.x.x:3000` for direct backend API
- `http://barangay.local` when local DNS or hosts file points to the Orange Pi IP

## PM2 Process Manager
1. Install PM2 globally:
```bash
sudo npm install -g pm2
```
2. Start the backend app:
```bash
cd /root
pm install
pm run start
# or define with pm2
pm2 start pm2/ecosystem.config.js --env production
```
3. Enable startup on boot:
```bash
pm2 startup systemd
pm2 save
```

## Firewall Configuration
1. Install UFW if not present:
```bash
sudo apt update
sudo apt install ufw
```
2. Allow HTTP, SSH, and app port:
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 3000/tcp
sudo ufw enable
```

## Backup and Restore
- Backup:
```bash
cd /root/backend
npm run backup
```
- Restore:
```bash
cd /root/backend
node scripts/restore.js backups/<file>.sql
```

## Local Network Access
- Access via IP: `http://192.168.x.x:3000`
- Access via local domain: configure your desktop/mobile `hosts` file or local DNS entry for `barangay.local` to point to the Orange Pi IP.

## Performance Tips for Orange Pi Zero 3
- Use PostgreSQL tuned for low RAM by setting `shared_buffers = 64MB` and `work_mem = 4MB` in `postgresql.conf`.
- Keep `NODE_ENV=production` and avoid running development watchers on the device.
- Use PM2 to keep backend alive and restart on crash.
- Keep file uploads local and remove old backups periodically.
