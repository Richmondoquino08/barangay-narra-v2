const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const backupDir = path.resolve(__dirname, '..', '..', 'backups');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

const filename = `barangay_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
const filepath = path.join(backupDir, filename);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required in .env');
  process.exit(1);
}

const command = `pg_dump --clean --if-exists "${databaseUrl}" > "${filepath}"`;
console.log(`Starting backup to ${filepath}`);
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('Backup failed', stderr || error.message);
    process.exit(1);
  }
  console.log('Backup completed:', filepath);
});
