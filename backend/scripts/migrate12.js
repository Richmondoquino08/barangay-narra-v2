const { Pool } = require('pg');
require('dotenv').config({ path: '/home/enovo/barangay-narra/barangay-system/backend/.env' });
const pool = new Pool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, port: process.env.DB_PORT
});
async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reference_documents (
      id SERIAL PRIMARY KEY,
      doc_name VARCHAR(255) NOT NULL,
      description TEXT,
      file_path VARCHAR(255) NOT NULL,
      file_type VARCHAR(100),
      file_size INTEGER,
      uploaded_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ reference_documents table created');
  await pool.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
