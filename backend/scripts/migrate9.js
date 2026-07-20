const { Pool } = require('pg');
require('dotenv').config({ path: '/home/enovo/barangay-narra/barangay-system/backend/.env' });
const pool = new Pool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, port: process.env.DB_PORT
});
async function run() {
  await pool.query("ALTER TABLE certificate_templates ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE");
  await pool.query("ALTER TABLE certificate_templates ADD COLUMN IF NOT EXISTS template_config JSONB DEFAULT '{}'");
  await pool.query("ALTER TABLE certificate_templates ADD COLUMN IF NOT EXISTS header_image_url TEXT");
  console.log('✓ certificate_templates updated for custom templates');
  await pool.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
