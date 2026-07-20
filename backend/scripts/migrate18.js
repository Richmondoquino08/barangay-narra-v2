const db = require('../config/db');

async function migrate() {
  console.log('Running migration 18 — Finance Phase 4 (Procurement Chain: ObR -> PR -> PO -> IAR -> RIS -> DV)...');
  try {
    // ── Module 10: Obligation Request (ObR) — commits budget against RAO ──
    await db.query(`
      CREATE TABLE IF NOT EXISTS obligation_requests (
        id            SERIAL PRIMARY KEY,
        ref_no        VARCHAR(30),
        fiscal_year   INTEGER NOT NULL,
        fund_key      VARCHAR(40) NOT NULL,
        entry_date    DATE DEFAULT CURRENT_DATE,
        office        VARCHAR(120) DEFAULT '',
        payee         VARCHAR(160) DEFAULT '',
        particulars   TEXT DEFAULT '',
        amount        NUMERIC(14,2) DEFAULT 0,
        status        VARCHAR(20) DEFAULT 'obligated',
        rao_entry_id  INTEGER REFERENCES rao_entries(id),
        created_at    TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Module 11: Purchase Request (PR) ──
    await db.query(`
      CREATE TABLE IF NOT EXISTS purchase_requests (
        id            SERIAL PRIMARY KEY,
        ref_no        VARCHAR(30),
        obr_id        INTEGER REFERENCES obligation_requests(id),
        pr_date       DATE DEFAULT CURRENT_DATE,
        requested_by  VARCHAR(160) DEFAULT '',
        office        VARCHAR(120) DEFAULT '',
        items         TEXT DEFAULT '[]',
        purpose       TEXT DEFAULT '',
        total_amount  NUMERIC(14,2) DEFAULT 0,
        status        VARCHAR(20) DEFAULT 'pending',
        created_at    TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Module 12: Purchase Order (PO) ──
    await db.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id              SERIAL PRIMARY KEY,
        ref_no          VARCHAR(30),
        pr_id           INTEGER REFERENCES purchase_requests(id),
        po_date         DATE DEFAULT CURRENT_DATE,
        supplier_name   VARCHAR(160) DEFAULT '',
        supplier_address VARCHAR(255) DEFAULT '',
        items           TEXT DEFAULT '[]',
        total_amount    NUMERIC(14,2) DEFAULT 0,
        mode_of_procurement VARCHAR(80) DEFAULT 'Shopping',
        terms           TEXT DEFAULT '',
        status          VARCHAR(20) DEFAULT 'pending',
        created_at      TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Module 13: Inspection and Acceptance Report (IAR) ──
    await db.query(`
      CREATE TABLE IF NOT EXISTS inspection_acceptance_reports (
        id            SERIAL PRIMARY KEY,
        ref_no        VARCHAR(30),
        po_id         INTEGER REFERENCES purchase_orders(id),
        date_inspected DATE DEFAULT CURRENT_DATE,
        date_received  DATE DEFAULT CURRENT_DATE,
        inspected_by  VARCHAR(160) DEFAULT '',
        items         TEXT DEFAULT '[]',
        complete      BOOLEAN DEFAULT TRUE,
        remarks       TEXT DEFAULT '',
        status        VARCHAR(20) DEFAULT 'accepted',
        created_at    TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Module 14: Requisition and Issue Slip (RIS) ──
    await db.query(`
      CREATE TABLE IF NOT EXISTS requisition_issue_slips (
        id            SERIAL PRIMARY KEY,
        ref_no        VARCHAR(30),
        iar_id        INTEGER REFERENCES inspection_acceptance_reports(id),
        ris_date      DATE DEFAULT CURRENT_DATE,
        requested_by  VARCHAR(160) DEFAULT '',
        office        VARCHAR(120) DEFAULT '',
        items         TEXT DEFAULT '[]',
        purpose       TEXT DEFAULT '',
        status        VARCHAR(20) DEFAULT 'issued',
        created_at    TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Module 15: Disbursement Voucher (DV) — settles obligation, posts to RAO ──
    await db.query(`
      CREATE TABLE IF NOT EXISTS disbursement_vouchers (
        id            SERIAL PRIMARY KEY,
        ref_no        VARCHAR(30),
        iar_id        INTEGER REFERENCES inspection_acceptance_reports(id),
        obr_id        INTEGER REFERENCES obligation_requests(id),
        dv_date       DATE DEFAULT CURRENT_DATE,
        payee         VARCHAR(160) DEFAULT '',
        particulars   TEXT DEFAULT '',
        amount        NUMERIC(14,2) DEFAULT 0,
        fund_key      VARCHAR(40) DEFAULT '',
        mode_of_payment VARCHAR(40) DEFAULT 'Check',
        check_no      VARCHAR(60) DEFAULT '',
        status        VARCHAR(20) DEFAULT 'pending',
        paid_date     DATE,
        created_at    TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Migration 18 complete.');
  } catch (err) {
    console.error('Migration 18 error:', err.message);
  } finally {
    process.exit(0);
  }
}

migrate();
