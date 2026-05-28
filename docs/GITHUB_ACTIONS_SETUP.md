# GitHub Actions Setup Guide

Automate your deployments using GitHub Actions. This guide shows how to set up automatic deployments when you push code to GitHub.

## Overview

The `.github/workflows/deploy.yml` file automatically:
- Pulls your latest code from GitHub
- Installs/updates dependencies
- Builds the frontend
- Restarts the backend service
- Reloads Nginx to serve the new frontend

## Prerequisites

- GitHub repository with the code
- Server with public internet access
- SSH access configured on the server

## Setup Steps

### Step 1: Generate SSH Key on Your Server

```bash
# Generate an SSH key pair (if you don't have one)
ssh-keygen -t ed25519 -C "github-actions" -N "" -f ~/.ssh/github_deploy

# View the private key (you'll need this for GitHub)
cat ~/.ssh/github_deploy
```

### Step 2: Add Public Key to Server Authorization

```bash
# Add the public key to authorized_keys
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Verify the key is added
cat ~/.ssh/authorized_keys
```

### Step 3: Add Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add these three secrets:

#### Secret 1: SERVER_HOST
- **Name**: `SERVER_HOST`
- **Value**: Your server's IP address or domain (e.g., `192.168.1.50`)

#### Secret 2: SERVER_USER
- **Name**: `SERVER_USER`
- **Value**: The username you use to SSH into the server (e.g., `root` or your username)

#### Secret 3: SERVER_SSH_KEY
- **Name**: `SERVER_SSH_KEY`
- **Value**: The contents of your private SSH key (e.g., `~/.ssh/github_deploy`)

To get the private key content:
```bash
cat ~/.ssh/github_deploy
```

Copy the entire output (including the BEGIN and END lines) and paste it into GitHub.

### Step 4: Test the Workflow

1. Make a small change to your code
2. Commit and push to the `main` branch:

```bash
git add .
git commit -m "Test GitHub Actions deployment"
git push origin main
```

3. Go to your GitHub repository → **Actions** tab
4. You should see your workflow running
5. Click on it to view the logs

## Workflow File Configuration

The workflow is defined in `.github/workflows/deploy.yml`. You can customize it:

### Trigger on Different Events

**Current (push to main/master)**:
```yaml
on:
  push:
    branches: [main, master]
```

**Trigger only on pull request merges**:
```yaml
on:
  pull_request:
    types: [closed]
    branches: [main]
```

**Trigger on release tags**:
```yaml
on:
  push:
    tags:
      - 'v*.*.*'
```

### Add Database Migrations

If your database schema changes, add migration steps:

```yaml
- name: Run database migrations
  uses: appleboy/ssh-action@master
  with:
    host: ${{ secrets.SERVER_HOST }}
    username: ${{ secrets.SERVER_USER }}
    key: ${{ secrets.SERVER_SSH_KEY }}
    script: |
      cd /var/www/barangay
      # Run your migration script here
      npm run migrate
```

### Add Slack Notifications

To get notified on deployment success/failure:

```yaml
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  if: always()
  with:
    status: ${{ job.status }}
    text: 'Deployment ${{ job.status }}'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

Add `SLACK_WEBHOOK` secret with your Slack webhook URL.

### Add Email Notifications

```yaml
- name: Send Email Notification
  if: failure()
  uses: davismatejcs/gmail-action@v1
  with:
    gmail-email: ${{ secrets.GMAIL_EMAIL }}
    gmail-password: ${{ secrets.GMAIL_PASSWORD }}
    to: your-email@example.com
    subject: 'Deployment Failed'
    body: 'Your deployment to production failed. Check GitHub Actions logs.'
```

## Troubleshooting

### Workflow Stuck or Not Running

1. Check the Actions tab in your repository
2. Click on the workflow to see error messages
3. Common issues:
   - Wrong SSH key or credentials
   - Server not reachable
   - PM2 process name incorrect

### SSH Connection Refused

```bash
# On your server, verify SSH is working
sudo systemctl status ssh

# Test SSH from your local machine
ssh -i ~/.ssh/github_deploy username@192.168.1.50
```

### PM2 Process Not Restarting

```bash
# On your server, check PM2 process name
pm2 list

# Update the workflow with the correct process name
pm2 restart <correct-process-name>
```

### Permission Denied Errors

```bash
# Ensure the SSH user has permission to access the app directory
sudo chown -R $USER:$USER /var/www/barangay

# Or allow sudo without password for PM2 and Nginx
sudo visudo
# Add these lines:
# your_username ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload nginx
# your_username ALL=(ALL) NOPASSWD: /usr/local/bin/pm2
```

## Advanced Configuration

### Conditional Deployments

Only deploy if tests pass:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    # ... rest of deploy job
```

### Multiple Environments

Deploy to staging on PR, production on merge:

```yaml
on:
  push:
    branches: [main, staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      ENVIRONMENT: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to ${{ env.ENVIRONMENT }}
        # ... deployment steps
```

## Best Practices

1. **Always test locally first** before pushing to GitHub
2. **Keep secrets secure** - never commit `.env` or private keys
3. **Use separate SSH keys** for different environments
4. **Monitor deployment logs** in the Actions tab
5. **Back up database** before deployments that might alter schema
6. **Use workflow_dispatch** to allow manual deployment triggers
7. **Add status badges** to your README:

```markdown
![Deploy Status](https://github.com/YOUR_USERNAME/barangay-management-system/actions/workflows/deploy.yml/badge.svg)
```

## Disable Automatic Deployments

If you want to disable automatic deployments temporarily:

1. Comment out the `push` trigger in `.github/workflows/deploy.yml`:

```yaml
# on:
#   push:
#     branches: [main, master]
on:
  workflow_dispatch:  # Only manual trigger
```

2. Commit and push the change

## More Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [appleboy/ssh-action](https://github.com/appleboy/ssh-action)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

