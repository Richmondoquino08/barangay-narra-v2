const db = require('../config/db');

async function migrate() {
  console.log('Running migration 24 — Add trash_bin table (soft-delete/recycle bin)...');
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS trash_bin (
        id SERIAL PRIMARY KEY,
        source_table VARCHAR(50) NOT NULL,
        source_id INTEGER NOT NULL,
        item_label VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        deleted_by_name VARCHAR(255) NOT NULL,
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        hidden_by_user BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_trash_bin_source ON trash_bin(source_table, source_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_trash_bin_deleted_by ON trash_bin(deleted_by)`);
    console.log('Migration 24 complete.');
  } catch (err) {
    console.error('Migration 24 error:', err.message);
  } finally {
    process.exit(0);
  }
}
migrate();
