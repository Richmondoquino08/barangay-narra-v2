const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function checkSchema() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'barangay_db',
    user: process.env.DB_USER || 'barangay_user',
    password: process.env.DB_PASSWORD || 'StrongPassword123'
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Tables in database:');
    console.log(tablesResult.rows);
    console.log('\n');

    // Get users table columns
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in users table:');
    console.log(columnsResult.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkSchema();
