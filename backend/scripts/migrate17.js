const db = require('../config/db');

async function migrate() {
  console.log('Running migration 17 — Finance Phase 3 (RAO — Record of Appropriations, Obligations & Disbursements)...');
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS rao_entries (
        id              SERIAL PRIMARY KEY,
        ref_no          VARCHAR(30),
        fiscal_year     INTEGER NOT NULL,
        fund_key        VARCHAR(40) NOT NULL,
        entry_date      DATE DEFAULT CURRENT_DATE,
        particulars     TEXT DEFAULT '',
        account_code    VARCHAR(60) DEFAULT '',
        payee           VARCHAR(160) DEFAULT '',
        obligation_amount    NUMERIC(14,2) DEFAULT 0,
        disbursement_amount  NUMERIC(14,2) DEFAULT 0,
        source_module   VARCHAR(40) DEFAULT 'manual',
        source_ref_id   INTEGER,
        created_at      TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_rao_fund_year ON rao_entries(fund_key, fiscal_year)`);
    console.log('Migration 17 complete.');
  } catch (err) {
    console.error('Migration 17 error:', err.message);
  } finally {
    process.exit(0);
  }
}

migrate();
