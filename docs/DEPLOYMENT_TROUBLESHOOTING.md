# Deployment Troubleshooting Guide

Solutions for common issues encountered during deployment of the Barangay Management System.

## Connection & Access Issues

### Cannot SSH to Server

**Problem**: `ssh: connect to host ... port 22: Connection refused`

**Solutions**:
```bash
# 1. Verify SSH is running on server
sudo systemctl status ssh
sudo systemctl restart ssh

# 2. Check firewall allows SSH
sudo ufw status
sudo ufw allow 22

# 3. Verify correct IP/hostname
ping 192.168.1.50

# 4. Check SSH key permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
```

### GitHub Clone Fails

**Problem**: `fatal: unable to access 'https://github.com/...'`

**Solutions**:
```bash
# 1. Check internet connection
ping google.com

# 2. Clear git credentials
git credential-cache flush

# 3. Try SSH instead of HTTPS
git clone git@github.com:USERNAME/repo.git

# 4. Check git configuration
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

### Permission Denied on Directory

**Problem**: `Permission denied: /var/www/barangay`

**Solutions**:
```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/barangay

# Fix permissions
chmod -R 755 /var/www/barangay
chmod -R 755 /var/www/barangay/backend/uploads

# Check current user
whoami

# Verify permissions
ls -la /var/www/barangay
```

---

## Installation Issues

### npm install Fails

**Problem**: `npm ERR! code ERESOLVE` or `npm ERR! EBADPLATFORM`

**Solutions**:
```bash
# 1. Clear npm cache
npm cache clean --force

# 2. Delete node_modules and lock file
rm -rf node_modules package-lock.json

# 3. Try install again
npm install

# 4. For compatibility issues
npm install --legacy-peer-deps

# 5. Check Node.js version
node --version  # Should be 20+
npm --version
```

### Missing Module Errors

**Problem**: `Cannot find module 'express'` or similar

**Solutions**:
```bash
# 1. Ensure you're in the correct directory
cd /var/www/barangay/backend
pwd  # Verify location

# 2. Reinstall specific package
npm install express

# 3. Check package.json exists
cat package.json | head -5

# 4. Check node_modules
ls -la node_modules/ | grep express
```

### Node Version Incompatible

**Problem**: `The engine "node" is incompatible` or `npm ERR! notsup`

**Solutions**:
```bash
# Check current version
node --version

# Install Node.js 20 (if not installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify new version
node --version  # Should show v20.x.x
```

---

## Database Issues

### Cannot Connect to PostgreSQL

**Problem**: `FATAL: Ident authentication failed` or `Connection refused`

**Solutions**:
```bash
# 1. Verify PostgreSQL is running
sudo systemctl status postgresql
sudo systemctl restart postgresql

# 2. Test connection
psql -h localhost -U barangay_user -d barangay_db -c "SELECT 1"

# 3. Check .env credentials
cat backend/.env | grep DB_

# 4. Verify database exists
sudo -u postgres psql -c "\l" | grep barangay

# 5. Check PostgreSQL is listening
sudo netstat -tln | grep 5432
```

### Database Authentication Failed

**Problem**: `password authentication failed` or `role "barangay_user" does not exist`

**Solutions**:
```bash
# 1. Connect as superuser and check users
sudo -u postgres psql -c "\du"

# 2. Recreate user if needed
sudo -u postgres psql << EOF
DROP USER IF EXISTS barangay_user;
CREATE USER barangay_user WITH PASSWORD 'new_password';
GRANT ALL PRIVILEGES ON DATABASE barangay_db TO barangay_user;
EOF

# 3. Update .env with correct password
nano backend/.env  # Edit DB_PASSWORD

# 4. Test connection again
psql "postgresql://barangay_user:password@localhost:5432/barangay_db" -c "SELECT 1"
```

### Database Schema Missing Tables

**Problem**: `relation "users" does not exist`

**Solutions**:
```bash
# 1. Check what tables exist
psql -d barangay_db -c "\dt"

# 2. If empty, initialize schema
psql "postgresql://barangay_user:password@localhost:5432/barangay_db" \
  -f /var/www/barangay/db/init.sql

# 3. Verify tables created
psql -d barangay_db -c "\dt"

# 4. If init.sql has issues, check file
cat /var/www/barangay/db/init.sql | head -20
```

### Database Disk Full

**Problem**: `could not write block ... No space left on device`

**Solutions**:
```bash
# Check disk usage
df -h

# Find large files
du -sh /var/lib/postgresql/*

# Backup and clean old WAL files
sudo -u postgres pg_archivecleanup -d /var/lib/postgresql/wal 000000010000000000000010

# Or expand disk space if on VM
# Then restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Backend Issues

### Backend Won't Start

**Problem**: Backend crashes immediately after starting with PM2

**Solutions**:
```bash
# 1. Check PM2 logs
pm2 logs barangay-backend --lines 50

# 2. Try starting manually to see error
cd /var/www/barangay/backend
npm start

# 3. Check .env file exists
ls -la .env

# 4. Check database connection
node -e "
const pg = require('pg');
const client = new pg.Client({
  host: 'localhost',
  database: 'barangay_db',
  user: 'barangay_user',
  password: 'your_password'
});
client.connect((err) => {
  if (err) console.error('Connection error:', err);
  else console.log('Connected!');
});
"

# 5. Check port 3000 is free
sudo lsof -i :3000
```

### PM2 Process Keeps Restarting

**Problem**: `Process unstable - pm2 auto restart in 100ms`

**Solutions**:
```bash
# 1. Check error logs
pm2 logs barangay-backend

# 2. Increase restart delay
pm2 start app.js --restart-delay 5000

# 3. Check system resources
free -h
df -h

# 4. Increase Node.js memory limit
NODE_OPTIONS=--max-old-space-size=512 pm2 start app.js

# 5. Update ecosystem config
nano pm2/ecosystem.config.js
# Add: max_memory_restart: '200M'
```

### Backend API Returns 500 Error

**Problem**: API endpoints return Internal Server Error (500)

**Solutions**:
```bash
# 1. Check backend logs
pm2 logs barangay-backend --lines 100

# 2. Test database connection
psql -h localhost -U barangay_user -d barangay_db -c "SELECT 1"

# 3. Check .env values
cat backend/.env | grep -E "^[A-Z_]"

# 4. Verify JWT secret is set
grep JWT_SECRET backend/.env

# 5. Check request format
curl -X GET http://localhost:3000/api/health

# 6. Enable verbose logging
NODE_ENV=development npm start
```

---

## Frontend Issues

### Frontend Build Fails

**Problem**: `npm run build` exits with error

**Solutions**:
```bash
# 1. Check for build errors
npm run build 2>&1 | tail -50

# 2. Clear build cache
rm -rf dist
rm -rf node_modules/.vite

# 3. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 4. Check Vite config
cat vite.config.js

# 5. Build with verbose output
npm run build -- --debug
```

### Static Files Not Loading (404 Errors)

**Problem**: CSS, JS, images return 404 in browser

**Solutions**:
```bash
# 1. Verify build created files
ls -la frontend/dist/
ls frontend/dist/assets/ | head

# 2. Check Nginx config points to dist
cat /etc/nginx/sites-available/barangay | grep root

# 3. Verify path in Nginx
sudo nginx -T | grep barangay -A 20

# 4. Update Nginx if path wrong
sudo nano /etc/nginx/sites-available/barangay
# Change: root /var/www/barangay/frontend/dist;

# 5. Reload Nginx
sudo systemctl reload nginx
```

### Frontend API Calls Fail

**Problem**: Browser console shows CORS error or cannot reach backend

**Solutions**:
```bash
# 1. Check backend is running
curl http://localhost:3000/api/health

# 2. Check CORS is enabled in backend
cat backend/app.js | grep -i cors

# 3. Verify correct API URL in frontend
cat frontend/.env | grep VITE_API

# 4. Check frontend environment variables
grep -r "VITE_API" frontend/src/ | head -3

# 5. Rebuild frontend
npm run build

# 6. Check Network tab in browser dev tools
# Open browser dev tools → Network tab
# See what API URL it's trying to reach
```

---

## Nginx Issues

### Nginx Won't Start

**Problem**: `sudo systemctl start nginx` fails

**Solutions**:
```bash
# 1. Check syntax errors
sudo nginx -t

# 2. View error output
sudo nginx -T

# 3. Check logs
sudo tail -20 /var/log/nginx/error.log

# 4. Find conflicting process
sudo lsof -i :80
sudo lsof -i :443

# 5. Restart nginx service
sudo systemctl restart nginx
sudo systemctl status nginx
```

### 502 Bad Gateway Error

**Problem**: Visiting site shows "502 Bad Gateway"

**Solutions**:
```bash
# 1. Verify backend is running
pm2 list
curl http://localhost:3000

# 2. Check backend is listening
sudo netstat -tln | grep 3000

# 3. Check Nginx config backend address
sudo cat /etc/nginx/sites-available/barangay | grep proxy_pass

# 4. Check Nginx error logs
sudo tail -50 /var/log/nginx/error.log

# 5. Check firewall
sudo ufw status
sudo ufw allow 3000

# 6. Restart backend
pm2 restart barangay-backend
```

### Timeout Loading Page

**Problem**: Website takes too long to load or times out

**Solutions**:
```bash
# 1. Check backend response time
time curl http://localhost:3000/api/health

# 2. Check system resources
free -h
top -b -n 1 | head -20

# 3. Check Nginx timeout settings
cat /etc/nginx/sites-available/barangay | grep timeout

# 4. Increase Nginx proxy timeouts
sudo nano /etc/nginx/sites-available/barangay
# Add:
# proxy_connect_timeout 60s;
# proxy_send_timeout 60s;
# proxy_read_timeout 60s;

# 5. Reload Nginx
sudo systemctl reload nginx

# 6. Check database query performance
psql -d barangay_db -c "SELECT COUNT(*) FROM users;"
```

---

## Port Conflicts

### Port Already in Use

**Problem**: `EADDRINUSE: address already in use :::3000`

**Solutions**:
```bash
# Find what's using the port
sudo lsof -i :3000

# Force kill the process
sudo kill -9 <PID>

# Or change port in .env
nano backend/.env
# Change PORT=3001

# For Nginx port 80
sudo lsof -i :80
sudo systemctl stop apache2  # If Apache is running
```

### Cannot Listen on Port 80 (Permission Denied)

**Problem**: `permission denied: /etc/nginx/sites-enabled/barangay`

**Solutions**:
```bash
# Run Nginx as sudo
sudo systemctl start nginx

# Or use port 8080 instead
sudo nano /etc/nginx/sites-available/barangay
# Change: listen 8080;

# Verify port is free
sudo lsof -i :8080

# Reload Nginx
sudo systemctl reload nginx
```

---

## Monitoring & Logs

### View Backend Logs

```bash
# Last 50 lines
pm2 logs barangay-backend --lines 50

# Real-time logs
pm2 logs barangay-backend

# Specific time range
pm2 logs barangay-backend --since "2024-05-23 10:00:00"

# Clear old logs
pm2 flush
```

### View Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log

# Combined view
sudo tail -f /var/log/nginx/*.log
```

### View System Logs

```bash
# PostgreSQL logs
sudo journalctl -u postgresql -f

# SSH logs (for security)
sudo tail -f /var/log/auth.log

# System logs
sudo journalctl -xe
```

---

## Performance Issues

### Slow Application Response

**Solutions**:
```bash
# 1. Check system resources
free -h
df -h
top -u $USER

# 2. Check if disk is full
df -h | grep -E "9[0-9]%|100%"

# 3. Check Node.js memory usage
ps aux | grep node

# 4. Monitor in real-time
pm2 monit

# 5. Check database query performance
# Add logging to database queries in code
# Or run EXPLAIN on slow queries in psql
```

### High CPU Usage

**Solutions**:
```bash
# 1. Identify high CPU process
top -o %CPU

# 2. Check if infinite loop exists
pm2 logs barangay-backend | grep -c "message"

# 3. Restart the process
pm2 restart barangay-backend

# 4. Monitor CPU
watch -n 1 'ps aux | grep node'
```

### High Memory Usage

**Solutions**:
```bash
# 1. Check memory per process
ps aux --sort -%mem | head

# 2. Restart service to free memory
pm2 restart barangay-backend

# 3. Set memory limit
pm2 start app.js --max-memory-restart 256M

# 4. Enable garbage collection
NODE_OPTIONS=--expose-gc npm start
```

---

## Recovery & Backup

### Emergency Restart All Services

```bash
# PostgreSQL
sudo systemctl restart postgresql

# PM2
pm2 restart all

# Nginx
sudo systemctl restart nginx

# Verify all running
pm2 list
sudo systemctl status nginx
sudo systemctl status postgresql
```

### Rollback to Previous Version

```bash
cd /var/www/barangay

# View commit history
git log --oneline | head -5

# Rollback to previous commit
git revert HEAD
# or
git reset --hard HEAD~1

# Restart services
pm2 restart barangay-backend
npm run build  # if frontend changed
```

### Database Backup & Restore

```bash
# Backup
pg_dump -U barangay_user -d barangay_db > backup.sql

# Restore
psql -U barangay_user -d barangay_db < backup.sql

# Restore to different database
psql -U postgres -c "CREATE DATABASE barangay_db_restore;"
psql -U barangay_user -d barangay_db_restore < backup.sql
```

---

## Getting Help

If you're stuck:

1. **Check logs first**: `pm2 logs barangay-backend`
2. **Check documentation**: [GITHUB_DEPLOYMENT.md](GITHUB_DEPLOYMENT.md)
3. **Test components individually**: Backend, frontend, database separately
4. **Share error messages**: Full error output is helpful
5. **Check prerequisites**: Node.js 20+, PostgreSQL 14+, Nginx, Git

Common diagnostic command:
```bash
echo "=== Node ==="
node --version
echo "=== PostgreSQL ==="
psql --version
echo "=== Git ==="
git --version
echo "=== Services ==="
pm2 list
sudo systemctl status nginx
sudo systemctl status postgresql
```

---

**Last Updated**: May 23, 2026

