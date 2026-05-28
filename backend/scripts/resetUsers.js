const bcryptjs = require('bcryptjs');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function resetUsers() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'barangay_db',
    user: process.env.DB_USER || 'barangay_user',
    password: process.env.DB_PASSWORD || 'StrongPassword123'
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database\n');

    // Delete all existing users
    console.log('Deleting existing users...');
    await client.query('DELETE FROM users');
    console.log('✓ All users deleted\n');

    // Prepare user data
    const users = [
      { name: 'Admin User', email: 'admin@barangay.com', password: 'Admin@123', role: 'admin' },
      { name: 'Secretary User', email: 'secretary@barangay.com', password: 'Secretary@123', role: 'secretary' },
      { name: 'Captain User', email: 'captain@barangay.com', password: 'Captain@123', role: 'captain' },
      { name: 'Treasurer User', email: 'treasurer@barangay.com', password: 'Treasurer@123', role: 'treasurer' }
    ];

    console.log('Creating new test accounts:\n');
    for (const user of users) {
      const hashedPassword = await bcryptjs.hash(user.password, 10);
      
      const result = await client.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [user.name, user.email, hashedPassword, user.role]
      );

      console.log(`✓ ${user.role.toUpperCase()} account created`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: ${user.password}`);
      console.log(`  User ID: ${result.rows[0].id}\n`);
    }

    console.log('✅ User reset completed successfully!\n');
    console.log('====================================');
    console.log('TEST CREDENTIALS SUMMARY');
    console.log('====================================\n');
    users.forEach(user => {
      console.log(`${user.role.toUpperCase()}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: ${user.password}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

resetUsers();
