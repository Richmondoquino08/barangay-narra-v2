const { Pool } = require('pg');
require('dotenv').config({ path: '/home/enovo/barangay-narra/barangay-system/backend/.env' });
const pool = new Pool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, port: process.env.DB_PORT
});
async function run() {
  await pool.query('ALTER TABLE barangay_projects ADD COLUMN IF NOT EXISTS completion_date DATE');
  console.log('✓ completion_date added to barangay_projects');
  await pool.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });