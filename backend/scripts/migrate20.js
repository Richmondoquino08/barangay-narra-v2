const db = require('../config/db');

async function migrate() {
  console.log('Running migration 20 — Widen profile_image_url to TEXT for base64 storage...');
  try {
    await db.query(`ALTER TABLE residents ALTER COLUMN profile_image_url TYPE TEXT`);
    console.log('Migration 20 complete.');
  } catch (err) {
    console.error('Migration 20 error:', err.message);
  } finally {
    process.exit(0);
  }
}
migrate();
