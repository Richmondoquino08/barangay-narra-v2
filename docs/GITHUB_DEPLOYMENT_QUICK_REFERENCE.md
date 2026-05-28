# GitHub Deployment Quick Reference

Quick commands for common deployment tasks on your server.

## Initial Deployment (One-time)

```bash
# 1. Clone repository
cd /var/www/barangay
git clone https://github.com/YOUR_USERNAME/barangay-management-system.git .

# 2. Setup environment
cd backend
cp .env.example .env
nano .env  # Update with your values

# 3. Setup database
sudo -u postgres psql -c "CREATE DATABASE barangay_db;"
sudo -u postgres psql -c "CREATE USER barangay_user WITH PASSWORD 'password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE barangay_db TO barangay_user;"
psql "postgresql://barangay_user:password@localhost:5432/barangay_db" -f ../db/init.sql

# 4. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 5. Build frontend
npm run build

# 6. Start with PM2
cd ..
pm2 start pm2/ecosystem.config.js --env production
pm2 save
pm2 startup systemd

# 7. Configure Nginx
sudo cp nginx/barangay.local.conf /etc/nginx/sites-available/barangay
sudo ln -s /etc/nginx/sites-available/barangay /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Regular Maintenance

### Update Code from GitHub

```bash
cd /var/www/barangay
git pull origin main
```

### Update Backend Only

```bash
cd /var/www/barangay/backend
npm install
pm2 restart barangay-backend
```

### Update Frontend Only

```bash
cd /var/www/barangay/frontend
npm install
npm run build
sudo systemctl reload nginx
```

### Restart Services

```bash
# Restart backend
pm2 restart barangay-backend

# Reload Nginx
sudo systemctl reload nginx

# Restart both
pm2 restart barangay-backend && sudo systemctl reload nginx
```

## Monitoring

### Check Status

```bash
# Backend status
pm2 status
pm2 info barangay-backend

# Nginx status
sudo systemctl status nginx

# Database status
sudo systemctl status postgresql
```

### View Logs

```bash
# Backend logs (last 50 lines)
pm2 logs barangay-backend --lines 50

# Real-time monitoring
pm2 monit

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Test Endpoints

```bash
# Test backend
curl http://localhost:3000/api/health

# Test frontend via Nginx
curl http://localhost/
```

## Database

### Backup Database

```bash
pg_dump -U barangay_user -d barangay_db > ~/barangay_backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
psql -U barangay_user -d barangay_db < ~/barangay_backup_20240523.sql
```

### Connect to Database

```bash
psql -h localhost -U barangay_user -d barangay_db
```

### Reset Database (⚠️ Careful!)

```bash
# Backup first!
pg_dump -U barangay_user -d barangay_db > ~/backup.sql

# Drop and recreate
sudo -u postgres psql -c "DROP DATABASE barangay_db;"
sudo -u postgres psql -c "CREATE DATABASE barangay_db;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE barangay_db TO barangay_user;"

# Re-initialize
psql "postgresql://barangay_user:password@localhost:5432/barangay_db" -f /var/www/barangay/db/init.sql
```

## Troubleshooting

### Backend Won't Start

```bash
# Check PM2 logs
pm2 logs barangay-backend

# Try starting manually
cd /var/www/barangay/backend
npm start

# Check .env file
cat .env
```

### Cannot Access Application

```bash
# Verify services are running
pm2 status
sudo systemctl status nginx

# Test backend directly
curl http://localhost:3000/api/health

# Check Nginx config
sudo nginx -t

# View Nginx error log
sudo tail -20 /var/log/nginx/error.log
```

### Database Connection Error

```bash
# Verify PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U barangay_user -d barangay_db -c "SELECT 1"

# Check .env credentials
grep "DB_" /var/www/barangay/backend/.env
```

### Port Already in Use

```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process if needed
sudo kill -9 <PID>

# For Nginx port 80:
sudo lsof -i :80
```

### Permission Issues

```bash
# Fix directory permissions
sudo chown -R $USER:$USER /var/www/barangay
chmod -R 755 /var/www/barangay
```

## Performance

### View System Resources

```bash
# Memory usage
free -h

# Disk usage
df -h

# CPU usage
top -u $USER

# PM2 monitoring dashboard
pm2 monit
```

### Optimize Node.js Memory

Edit PM2 config `/var/www/barangay/pm2/ecosystem.config.js`:

```javascript
{
  name: 'barangay-backend',
  script: 'backend/app.js',
  instances: 'max',        // Use all CPU cores
  instance_var: 'INSTANCE_ID',
  exec_mode: 'cluster',    // Clustering mode
  max_memory_restart: '200M', // Restart if exceeds 200MB
}
```

Then restart:
```bash
pm2 restart barangay-backend
```

## Useful Links

- **Full Deployment Guide**: [GITHUB_DEPLOYMENT.md](GITHUB_DEPLOYMENT.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **API Routes**: [API_ROUTES.md](API_ROUTES.md)
- **Node.js Docs**: https://nodejs.org/docs/
- **PM2 Docs**: https://pm2.keymetrics.io/
- **Nginx Docs**: https://nginx.org/en/docs/

