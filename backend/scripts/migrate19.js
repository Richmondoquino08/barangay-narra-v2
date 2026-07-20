const db = require('../config/db');

async function migrate() {
  console.log('Running migration 19 — Finance Phase 5 (CRDR, CHBR, Itemized Collections, Transmittal Letter)...');
  try {
    // Module 6: Cash Receipts & Disbursements Record (combined cashbook)
    await db.query(`CREATE TABLE IF NOT EXISTS crdr_entries (
      id SERIAL PRIMARY KEY, ref_no VARCHAR(30), entry_date DATE DEFAULT CURRENT_DATE,
      particulars TEXT DEFAULT '', payee_payor VARCHAR(160) DEFAULT '',
      receipt_amount NUMERIC(14,2) DEFAULT 0, disbursement_amount NUMERIC(14,2) DEFAULT 0,
      source_module VARCHAR(40) DEFAULT '', source_ref_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW())`);

    // Module 7: Cash in Bank Register
    await db.query(`CREATE TABLE IF NOT EXISTS chbr_entries (
      id SERIAL PRIMARY KEY, ref_no VARCHAR(30), bank_name VARCHAR(120) DEFAULT '',
      account_no VARCHAR(60) DEFAULT '', entry_date DATE DEFAULT CURRENT_DATE,
      particulars TEXT DEFAULT '', deposit_amount NUMERIC(14,2) DEFAULT 0, withdrawal_amount NUMERIC(14,2) DEFAULT 0,
      source_module VARCHAR(40) DEFAULT '', source_ref_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW())`);

    // Module 9: Itemized Collections (revenue-source ledger; auto-posts into CRDR/CHBR)
    await db.query(`CREATE TABLE IF NOT EXISTS collection_items (
      id SERIAL PRIMARY KEY, ref_no VARCHAR(30), collection_date DATE DEFAULT CURRENT_DATE,
      collected_by VARCHAR(160) DEFAULT '', payor VARCHAR(160) DEFAULT '',
      revenue_source VARCHAR(120) DEFAULT '', or_no VARCHAR(60) DEFAULT '',
      amount NUMERIC(14,2) DEFAULT 0, remarks TEXT DEFAULT '',
      deposited BOOLEAN DEFAULT FALSE, bank_name VARCHAR(120) DEFAULT '',
      crdr_entry_id INTEGER REFERENCES crdr_entries(id), chbr_entry_id INTEGER REFERENCES chbr_entries(id),
      created_at TIMESTAMP DEFAULT NOW())`);

    // Module 18: Transmittal Letter
    await db.query(`CREATE TABLE IF NOT EXISTS transmittal_letters (
      id SERIAL PRIMARY KEY, ref_no VARCHAR(30), letter_date DATE DEFAULT CURRENT_DATE,
      addressee VARCHAR(160) DEFAULT '', office_address TEXT DEFAULT '',
      subject VARCHAR(255) DEFAULT '', documents TEXT DEFAULT '[]',
      prepared_by VARCHAR(160) DEFAULT '', status VARCHAR(20) DEFAULT 'sent',
      created_at TIMESTAMP DEFAULT NOW())`);

    console.log('Migration 19 complete.');
  } catch (err) { console.error('Migration 19 error:', err.message); }
  finally { process.exit(0); }
}
migrate();
