const { Pool } = require('pg');
require('dotenv').config({ path: '/home/enovo/barangay-narra/barangay-system/backend/.env' });
const pool = new Pool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, port: process.env.DB_PORT
});
async function run() {
  await pool.query("ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS province VARCHAR(100) DEFAULT ''");
  await pool.query("ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS city_municipality VARCHAR(100) DEFAULT ''");
  await pool.query("ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS right_logo_url TEXT DEFAULT ''");
  await pool.query("ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS secretary_name VARCHAR(255) DEFAULT ''");
  await pool.query("ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS secretary_title VARCHAR(100) DEFAULT 'Barangay Secretary'");
  await pool.query("ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS cert_validity TEXT DEFAULT 'Valid for three (3) months only'");
  console.log('✓ Certificate settings columns added');
  await pool.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
