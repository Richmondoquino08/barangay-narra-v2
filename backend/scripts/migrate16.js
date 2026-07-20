const db = require('../config/db');

async function migrate() {
  console.log('Running migration 16 — Finance Phase 2 (Petty Cash Fund + SPPCV)...');
  try {
    // ── Module 4: Petty Cash Fund (PCF) ──
    await db.query(`
      CREATE TABLE IF NOT EXISTS petty_cash_funds (
        id              SERIAL PRIMARY KEY,
        ref_no          VARCHAR(30),
        custodian_name  VARCHAR(160) NOT NULL,
        date_established DATE DEFAULT CURRENT_DATE,
        fund_amount     NUMERIC(12,2) DEFAULT 0,
        current_balance NUMERIC(12,2) DEFAULT 0,
        status          VARCHAR(20) DEFAULT 'active',
        remarks         TEXT DEFAULT '',
        created_at      TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Module 5: Summary of Paid Petty Cash Vouchers (SPPCV) ──
    await db.query(`
      CREATE TABLE IF NOT EXISTS petty_cash_vouchers (
        id              SERIAL PRIMARY KEY,
        ref_no          VARCHAR(30),
        pcf_id          INTEGER REFERENCES petty_cash_funds(id) ON DELETE CASCADE,
        pcv_date        DATE DEFAULT CURRENT_DATE,
        payee           VARCHAR(160) NOT NULL,
        particulars     TEXT DEFAULT '',
        account_code    VARCHAR(60) DEFAULT '',
        amount          NUMERIC(12,2) DEFAULT 0,
        balance_after   NUMERIC(12,2) DEFAULT 0,
        created_at      TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Migration 16 complete.');
  } catch (err) {
    console.error('Migration 16 error:', err.message);
  } finally {
    process.exit(0);
  }
}

migrate();
