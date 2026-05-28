const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const backupFile = process.argv[2];
if (!backupFile) {
  console.error('Usage: node scripts/restore.js <backup-file.sql>');
  process.exit(1);
}

const filepath = path.resolve(backupFile);
if (!fs.existsSync(filepath)) {
  console.error('Backup file not found:', filepath);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required in .env');
  process.exit(1);
}

const command = `psql "${databaseUrl}" < "${filepath}"`;
console.log(`Restoring database from ${filepath}`);
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('Restore failed', stderr || error.message);
    process.exit(1);
  }
  console.log('Restore completed');
});
