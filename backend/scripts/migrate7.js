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
    // Expand barangay_budget with proper DBM fields
    await client.query("ALTER TABLE barangay_budget ADD COLUMN IF NOT EXISTS ira_share DECIMAL(15,2) DEFAULT 0");
    await client.query("ALTER TABLE barangay_budget ADD COLUMN IF NOT EXISTS estimated_local_revenue DECIMAL(15,2) DEFAULT 0");
    await client.query("ALTER TABLE barangay_budget ADD COLUMN IF NOT EXISTS sk_fund DECIMAL(15,2) DEFAULT 0");
    await client.query("ALTER TABLE barangay_budget ADD COLUMN IF NOT EXISTS gad_fund DECIMAL(15,2) DEFAULT 0");
    await client.query("ALTER TABLE barangay_budget ADD COLUMN IF NOT EXISTS bcpc_fund DECIMAL(15,2) DEFAULT 0");
    await client.query("ALTER TABLE barangay_budget ADD COLUMN IF NOT EXISTS ps_budget DECIMAL(15,2) DEFAULT 0");
    await client.query("ALTER TABLE barangay_budget ADD COLUMN IF NOT EXISTS debt_service DECIMAL(15,2) DEFAULT 0");
    console.log('✓ barangay_budget expanded with DBM fields');
    await client.query('COMMIT');
    console.log('✅ Migration 7 done');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message); throw err;
  } finally { client.release(); await pool.end(); }
}
run().catch(e => { console.error(e.message); process.exit(1); });