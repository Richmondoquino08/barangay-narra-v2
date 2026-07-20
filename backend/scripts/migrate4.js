const { Pool } = require('pg');
require('dotenv').config({ path: '/home/enovo/barangay-narra/barangay-system/backend/.env' });
const pool = new Pool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, port: process.env.DB_PORT
});
async function run() {
  await pool.query("ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS login_bg_url TEXT DEFAULT ''");
  console.log('✓ login_bg_url column added');
  await pool.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });