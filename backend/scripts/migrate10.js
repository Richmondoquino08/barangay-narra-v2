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

    // New blotter fields per the barangay blotter procedure
    await client.query("ALTER TABLE blotter_records ADD COLUMN IF NOT EXISTS report_datetime TIMESTAMPTZ DEFAULT NOW()");
    await client.query("ALTER TABLE blotter_records ADD COLUMN IF NOT EXISTS complainant_address VARCHAR(255)");
    await client.query("ALTER TABLE blotter_records ADD COLUMN IF NOT EXISTS complainant_contact VARCHAR(50)");
    await client.query("ALTER TABLE blotter_records ADD COLUMN IF NOT EXISTS respondent_address VARCHAR(255)");
    await client.query("ALTER TABLE blotter_records ADD COLUMN IF NOT EXISTS respondent_contact VARCHAR(50)");
    await client.query("ALTER TABLE blotter_records ADD COLUMN IF NOT EXISTS witnesses TEXT");
    await client.query("ALTER TABLE blotter_records ADD COLUMN IF NOT EXISTS injuries_damages TEXT");
    await client.query("ALTER TABLE blotter_records ADD COLUMN IF NOT EXISTS barangay_action VARCHAR(100)");
    await client.query("ALTER TABLE blotter_records ADD COLUMN IF NOT EXISTS is_special_case BOOLEAN DEFAULT FALSE");
    await client.query("ALTER TABLE blotter_records ADD COLUMN IF NOT EXISTS special_case_type VARCHAR(100)");
    await client.query("ALTER TABLE blotter_records ADD COLUMN IF NOT EXISTS complainant_signed BOOLEAN DEFAULT FALSE");
    await client.query("ALTER TABLE blotter_records ADD COLUMN IF NOT EXISTS lupon_case_number VARCHAR(50)");

    // Expand status to include summoned + certified_action
    await client.query("ALTER TABLE blotter_records DROP CONSTRAINT IF EXISTS blotter_records_status_check");
    await client.query(`
      ALTER TABLE blotter_records ADD CONSTRAINT blotter_records_status_check
      CHECK (status IN ('pending','summoned','mediation','settled','referred_pnp','referred_court','certified_action','closed'))
    `);
    console.log('✓ blotter_records updated with procedure-aligned fields');

    await client.query('COMMIT');
    console.log('✅ Migration 10 done');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message); throw err;
  } finally { client.release(); await pool.end(); }
}
run().catch(e => { console.error(e.message); process.exit(1); });
