const db = require('../config/db');

async function migrate() {
  console.log("Running migration 22 — Add 'issued' to certificates.status CHECK constraint...");
  try {
    await db.query(`ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_status_check`);
    await db.query(`
      ALTER TABLE certificates ADD CONSTRAINT certificates_status_check
      CHECK (status IN ('draft','pending','issued','approved','rejected'))
    `);
    console.log('Migration 22 complete.');
  } catch (err) {
    console.error('Migration 22 error:', err.message);
  } finally {
    process.exit(0);
  }
}
migrate();
