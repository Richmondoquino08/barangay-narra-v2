const { Pool } = require('pg');
require('dotenv').config({ path: '/home/enovo/barangay-narra/barangay-system/backend/.env' });
const pool = new Pool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, port: process.env.DB_PORT
});
async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Annual budget declarations
    await client.query(`
      CREATE TABLE IF NOT EXISTS barangay_budget (
        id SERIAL PRIMARY KEY,
        fiscal_year INT NOT NULL,
        total_budget DECIMAL(15,2) DEFAULT 0,
        general_fund DECIMAL(15,2) DEFAULT 0,
        dev_fund_20pct DECIMAL(15,2) DEFAULT 0,
        drrm_fund_5pct DECIMAL(15,2) DEFAULT 0,
        special_fund DECIMAL(15,2) DEFAULT 0,
        notes TEXT,
        declared_by INT REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(fiscal_year)
      )
    `);
    console.log('✓ barangay_budget table created');

    // Salary / payroll records
    await client.query(`
      CREATE TABLE IF NOT EXISTS salary_records (
        id SERIAL PRIMARY KEY,
        employee_name VARCHAR(255) NOT NULL,
        position VARCHAR(100),
        payment_type VARCHAR(50) DEFAULT 'Monthly Salary',
        amount DECIMAL(10,2) NOT NULL,
        period_label VARCHAR(50),
        paid_date DATE,
        or_number VARCHAR(50),
        fund_source VARCHAR(100) DEFAULT 'General Fund',
        notes TEXT,
        recorded_by INT REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ salary_records table created');

    // Add budget_category to finances for grouping
    await client.query("ALTER TABLE finances ADD COLUMN IF NOT EXISTS budget_category VARCHAR(100)");
    await client.query("ALTER TABLE finances ADD COLUMN IF NOT EXISTS source_type VARCHAR(50)");
    await client.query("ALTER TABLE finances ADD COLUMN IF NOT EXISTS source_ref_id INT");
    console.log('✓ finances table updated');

    await client.query('COMMIT');
    console.log('\n✅ Migration 6 done');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration 6 failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(e => { console.error(e.message); process.exit(1); });