const db = require('../config/db');

async function migrate() {
  console.log('Running migration 14 — add role_permissions to system_settings...');
  try {
    await db.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS role_permissions TEXT DEFAULT NULL`);
    console.log('Migration 14 complete.');
  } catch (err) {
    console.error('Migration 14 error:', err.message);
  } finally {
    process.exit(0);
  }
}

migrate();