const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'barangay_user',
  password: process.env.DB_PASSWORD || 'StrongPassword123',
  database: process.env.DB_NAME || 'barangay_system',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z'
});

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✓ MySQL Database connected successfully');
    connection.release();
  } catch (err) {
    console.error('✗ MySQL Database connection error:', err.message);
  }
}

testConnection();

module.exports = pool;
