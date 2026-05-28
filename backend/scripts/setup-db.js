#!/usr/bin/env node
// Run: node scripts/setup-db.js
// Creates the admin user with a proper bcrypt hash

const { Pool } = require('pg');
const bcryptjs = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'barangay_user',
  password: process.env.DB_PASSWORD || 'BarangayPass2024!',
  database: process.env.DB_NAME || 'barangay_system',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function main() {
  console.log('Setting up Barangay Management System database...\n');

  // Run schema
  const schemaPath = path.join(__dirname, '../../db/init.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Execute schema statements one by one (skip the placeholder admin INSERT)
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.toLowerCase().includes('admin@barangay'));

  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (err) {
      if (!err.message.includes('already exists') && !err.message.includes('duplicate key')) {
        console.warn('Statement warning:', err.message.substring(0, 80));
      }
    }
  }
  console.log('✓ Schema applied');

  // Create admin user with proper hash
  const adminPassword = 'Admin@2024';
  const hash = await bcryptjs.hash(adminPassword, 10);

  await pool.query(`
    INSERT INTO users (full_name, email, password, role, is_active)
    VALUES ($1, $2, $3, $4, true)
    ON CONFLICT (email) DO UPDATE SET password = $3, is_active = true
  `, ['System Administrator', 'admin@barangay.gov.ph', hash, 'admin']);
  console.log('✓ Admin user created/updated');

  // Ensure default settings row exists
  await pool.query(`
    INSERT INTO system_settings (barangay_name, address, captain)
    VALUES ('Barangay Narra', 'Narra, Palawan', 'TBD')
    ON CONFLICT DO NOTHING
  `);
  console.log('✓ Default settings inserted');

  await pool.end();

  console.log('\n========================================');
  console.log('  Database setup complete!');
  console.log('========================================');
  console.log('  Admin login credentials:');
  console.log('  Email   : admin@barangay.gov.ph');
  console.log('  Password: Admin@2024');
  console.log('========================================\n');
}

main().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});