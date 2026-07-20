const db = require('../config/db');

async function migrate() {
  console.log('Running migration 13 — add treasurer fields to system_settings...');
  try {
    await db.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS treasurer_name VARCHAR(255) DEFAULT ''`);
    await db.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS treasurer_title VARCHAR(255) DEFAULT 'Barangay Treasurer'`);
    console.log('Migration 13 complete.');
  } catch (err) {
    console.error('Migration 13 error:', err.message);
  } finally {
    process.exit(0);
  }
}

migrate();
