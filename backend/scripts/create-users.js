#!/usr/bin/env node
const { Pool } = require('pg');
const bcryptjs = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'barangay_user',
  password: process.env.DB_PASSWORD || 'BarangayPass2024!',
  database: process.env.DB_NAME || 'barangay_system',
  port: parseInt(process.env.DB_PORT || '5432'),
});

const users = [
  { full_name: 'System Administrator', email: 'admin@barangay.gov.ph',     password: 'Admin@2024',     role: 'admin' },
  { full_name: 'Maria Santos',          email: 'secretary@barangay.gov.ph',  password: 'Secretary@2024', role: 'secretary' },
  { full_name: 'Jose Reyes',            email: 'captain@barangay.gov.ph',    password: 'Captain@2024',   role: 'captain' },
  { full_name: 'Ana Cruz',              email: 'treasurer@barangay.gov.ph',  password: 'Treasurer@2024', role: 'treasurer' },
];

async function main() {
  console.log('Creating user accounts...\n');

  for (const u of users) {
    const hash = await bcryptjs.hash(u.password, 10);
    await pool.query(`
      INSERT INTO users (full_name, email, password, role, is_active)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (email) DO UPDATE SET password = $3, is_active = true, full_name = $1
    `, [u.full_name, u.email, hash, u.role]);
    console.log(`✓ ${u.role.padEnd(12)} | ${u.email.padEnd(35)} | Password: ${u.password}`);
  }

  await pool.end();

  console.log('\n============================================================');
  console.log('  ALL ACCOUNTS READY');
  console.log('============================================================');
  console.log('  ROLE         EMAIL                              PASSWORD');
  console.log('  ------------ ---------------------------------- -----------');
  users.forEach(u => {
    console.log(`  ${u.role.padEnd(12)} ${u.email.padEnd(35)} ${u.password}`);
  });
  console.log('============================================================\n');
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });