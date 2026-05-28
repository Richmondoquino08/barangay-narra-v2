# Deployment Checklist

Use this checklist to ensure your Barangay Management System is properly deployed from GitHub.

## Pre-Deployment

### GitHub Repository
- [ ] Code pushed to GitHub repository
- [ ] Main branch is up to date with local code
- [ ] `.env` files are in `.gitignore` (not committed)
- [ ] `.node_modules/` folders are in `.gitignore`
- [ ] `db/` folder contains `init.sql`
- [ ] `pm2/ecosystem.config.js` is configured
- [ ] `nginx/barangay.local.conf` exists
- [ ] GitHub Actions workflow file (`.github/workflows/deploy.yml`) is set up

### Server Setup
- [ ] Server has Ubuntu/Debian OS
- [ ] SSH access configured (with SSH key)
- [ ] Internet connection available
- [ ] Sufficient disk space (check with `df -h`)
- [ ] Sufficient RAM (at least 1GB for Node.js)

### Required Software
- [ ] Node.js 20+ installed (`node --version`)
- [ ] npm/yarn installed (`npm --version`)
- [ ] PostgreSQL 14+ installed (`psql --version`)
- [ ] Nginx installed (`nginx -v`)
- [ ] Git installed (`git --version`)
- [ ] sudo access available

## Initial Deployment

### 1. Server Preparation
- [ ] Created `/var/www/barangay` directory
- [ ] Set correct permissions: `sudo chown -R $USER:$USER /var/www/barangay`
- [ ] SSH key configured on server (if using GitHub Actions)

### 2. Clone Repository
- [ ] Repository cloned: `git clone https://github.com/YOUR_USERNAME/barangay-management-system.git`
- [ ] All files present: `ls -la backend frontend db nginx pm2`
- [ ] `.git` folder exists
- [ ] Remote configured: `git remote -v`

### 3. Environment Configuration
- [ ] Backend `.env` file created: `backend/.env`
- [ ] Database credentials in `.env` are correct
- [ ] JWT_SECRET is strong and unique
- [ ] APP_URL matches server IP/domain
- [ ] Frontend `.env` created (if needed)

### 4. Database Setup
- [ ] PostgreSQL is running: `sudo systemctl status postgresql`
- [ ] Database created: `barangay_db`
- [ ] Database user created: `barangay_user`
- [ ] User has correct permissions
- [ ] Schema initialized: `init.sql` run
- [ ] Tables created: `psql -d barangay_db -c "\dt"` shows tables
- [ ] Database connection works: `npm run test:db` (if available)

### 5. Dependencies Installation
- [ ] Backend dependencies installed: `cd backend && npm install`
- [ ] No critical vulnerabilities: `npm audit` shows no high/critical issues
- [ ] Frontend dependencies installed: `cd frontend && npm install`
- [ ] Frontend build successful: `npm run build && ls dist/`

### 6. Backend Configuration
- [ ] `.env` file exists in `backend/` directory
- [ ] All required environment variables set
- [ ] Database connection tested
- [ ] Backend starts manually: `npm start` (Ctrl+C to stop)
- [ ] No error messages in startup

### 7. Frontend Build
- [ ] `dist/` folder created: `ls frontend/dist/`
- [ ] `index.html` exists in dist folder
- [ ] All assets compiled
- [ ] No build errors in terminal

### 8. PM2 Setup
- [ ] PM2 installed globally: `pm2 --version`
- [ ] Application started with PM2: `pm2 start pm2/ecosystem.config.js`
- [ ] Process showing in PM2 list: `pm2 list`
- [ ] Process is online (not errored)
- [ ] Startup on boot enabled: `pm2 startup systemd` completed
- [ ] PM2 configuration saved: `pm2 save`
- [ ] PM2 status good: `pm2 status`

### 9. Nginx Configuration
- [ ] Config file copied: `/etc/nginx/sites-available/barangay`
- [ ] Symlink created: `/etc/nginx/sites-enabled/barangay`
- [ ] Default site disabled (optional)
- [ ] Nginx syntax valid: `sudo nginx -t` shows "successful"
- [ ] Nginx reloaded: `sudo systemctl reload nginx`
- [ ] Nginx is running: `sudo systemctl status nginx`
- [ ] Frontend path correct in Nginx config
- [ ] Backend proxy path correct in Nginx config

### 10. Service Verification
- [ ] PostgreSQL running: `sudo systemctl status postgresql`
- [ ] PM2 process running: `pm2 list`
- [ ] Nginx running: `sudo systemctl status nginx`
- [ ] No port conflicts: `sudo lsof -i :3000` and `sudo lsof -i :80`

## Testing & Validation

### API Testing
- [ ] Backend API responds: `curl http://localhost:3000/api/health`
- [ ] Backend on correct port
- [ ] API returns JSON (not HTML error)
- [ ] Database queries work (test endpoint that uses DB)

### Frontend Testing
- [ ] Frontend accessible: `curl http://localhost/`
- [ ] Frontend returns HTML (not 404)
- [ ] No 404 errors for static files
- [ ] CSS and JavaScript load properly
- [ ] Can access via domain: `http://barangay.local` or `http://192.168.1.50`

### Browser Testing
- [ ] Open browser and navigate to application
- [ ] Login page loads without errors
- [ ] Can log in with test credentials
- [ ] Dashboard loads
- [ ] Can navigate between pages
- [ ] No console errors (check browser dev tools)
- [ ] API calls work (check Network tab in dev tools)

### Log Verification
- [ ] Backend logs accessible: `pm2 logs barangay-backend`
- [ ] No error messages in logs
- [ ] Requests appear in logs
- [ ] Database operations successful

## Post-Deployment

### Security
- [ ] SSH key properly secured
- [ ] `backend/.env` has strong passwords
- [ ] JWT_SECRET is unique and strong
- [ ] CORS is configured correctly
- [ ] Rate limiting is enabled
- [ ] Helmet security headers enabled

### Backups
- [ ] Database backup created: `pg_dump -U barangay_user barangay_db > backup.sql`
- [ ] Backup file stored safely
- [ ] Backup restoration tested (optional)

### Monitoring
- [ ] PM2 logs monitored: `pm2 logs`
- [ ] Nginx error logs checked: `sudo tail /var/log/nginx/error.log`
- [ ] System resources monitored: `free -h`, `df -h`
- [ ] Alerts set up (optional)

### Documentation
- [ ] README updated with deployment info
- [ ] Environment variables documented
- [ ] Known issues documented
- [ ] Team informed of deployment

## GitHub Actions Setup (Optional)

### Workflow Configuration
- [ ] `.github/workflows/deploy.yml` exists
- [ ] Workflow file syntax valid (no errors)
- [ ] SSH secrets added to GitHub:
  - [ ] SERVER_HOST
  - [ ] SERVER_USER
  - [ ] SERVER_SSH_KEY
- [ ] Secrets have correct values
- [ ] Server directory path is correct in workflow

### Workflow Testing
- [ ] Manual deployment trigger works: `workflow_dispatch`
- [ ] Automatic trigger configured (push to main)
- [ ] Test deployment initiated
- [ ] Workflow runs successfully
- [ ] Code deployed to server
- [ ] Services restarted automatically
- [ ] No SSH permission errors

## Maintenance & Updates

### Regular Tasks
- [ ] Daily: Check logs for errors
- [ ] Weekly: Verify all services running
- [ ] Weekly: Monitor disk and memory usage
- [ ] Monthly: Update dependencies: `npm update`
- [ ] Monthly: Backup database
- [ ] When needed: Pull latest code: `git pull origin main`

### Updating Code
- [ ] `git pull origin main` completed
- [ ] Dependencies updated: `npm install`
- [ ] Frontend rebuilt: `npm run build`
- [ ] Services restarted: `pm2 restart barangay-backend`
- [ ] Nginx reloaded: `sudo systemctl reload nginx`
- [ ] Updated code verified: `curl` test or browser check

### Troubleshooting Process
- [ ] Check PM2 logs: `pm2 logs barangay-backend`
- [ ] Check Nginx logs: `sudo tail -50 /var/log/nginx/error.log`
- [ ] Check database connection
- [ ] Verify `.env` values
- [ ] Check system resources: `free -h`, `df -h`
- [ ] Restart services if needed
- [ ] Review security logs if applicable

## Rollback Plan

If deployment fails:
- [ ] Identify error from logs
- [ ] Git revert to previous version: `git revert HEAD`
- [ ] Restart services: `pm2 restart barangay-backend`
- [ ] Check if services recover
- [ ] If database issue, restore from backup
- [ ] Contact support/team if stuck

## Emergency Procedures

### Service Down
```bash
# Check what's running
pm2 list
sudo systemctl status nginx
sudo systemctl status postgresql

# Restart all services
pm2 restart barangay-backend
sudo systemctl restart nginx
sudo systemctl restart postgresql
```

### Disk Full
```bash
# Check disk usage
df -h

# Clear logs if needed
pm2 flush

# Clear npm cache
npm cache clean --force
```

### Database Issues
```bash
# Check database connection
psql -h localhost -U barangay_user -d barangay_db -c "SELECT 1"

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Cannot SSH to Server
- [ ] Verify server IP/domain
- [ ] Check SSH key permissions: `chmod 600 ~/.ssh/key`
- [ ] Verify SSH is running on server: `sudo systemctl status ssh`
- [ ] Check firewall rules
- [ ] Try connecting with password if key fails

## Success Criteria

Your deployment is complete and successful when:

✅ All checkboxes above are marked
✅ Application is accessible via browser
✅ Users can log in and use all features
✅ No critical errors in logs
✅ All services are running
✅ Database operations work
✅ Frontend assets load correctly
✅ Backups are configured
✅ Team is trained on maintenance

## Additional Resources

- **Full Guide**: [GITHUB_DEPLOYMENT.md](GITHUB_DEPLOYMENT.md)
- **Quick Reference**: [GITHUB_DEPLOYMENT_QUICK_REFERENCE.md](GITHUB_DEPLOYMENT_QUICK_REFERENCE.md)
- **GitHub Actions**: [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **API Documentation**: [API_ROUTES.md](API_ROUTES.md)

---

**Last Updated**: May 23, 2026

