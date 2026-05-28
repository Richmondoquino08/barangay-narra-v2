const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'barangay_user',
  password: process.env.DB_PASSWORD || 'BarangayPass2024!',
  database: process.env.DB_NAME || 'barangay_system',
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Convert MySQL ? placeholders to PostgreSQL $1, $2, ...
function convertPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

// Normalize MySQL-specific SQL to PostgreSQL
function normalizeSql(sql) {
  return sql
    .replace(/CURDATE\(\)/gi, 'CURRENT_DATE')
    .replace(/NOW\(\)/gi, 'NOW()')
    .replace(/ = "([^"]+)"/g, " = '$1'")
    .replace(/THEN "([^"]+)"/g, "THEN '$1'")
    .replace(/\bIF\(([^,]+),\s*([^,]+),\s*([^)]+)\)/gi, 'CASE WHEN $1 THEN $2 ELSE $3 END');
}

// Build a mysql2-compatible result object from pg result
function buildResult(pgResult, sql) {
  const isInsert = /^\s*INSERT/i.test(sql);
  return {
    insertId: isInsert && pgResult.rows[0] ? pgResult.rows[0].id : null,
    affectedRows: pgResult.rowCount || 0,
    rowCount: pgResult.rowCount || 0,
  };
}

// Wrap pool.query to return [rows, resultInfo] like mysql2
const wrappedPool = {
  async query(sql, params = []) {
    let sqlStr = normalizeSql(sql.trim());
    sqlStr = convertPlaceholders(sqlStr);

    // Auto-append RETURNING id for INSERT without RETURNING
    if (/^\s*INSERT/i.test(sqlStr) && !/RETURNING/i.test(sqlStr)) {
      sqlStr += ' RETURNING id';
    }

    const pgResult = await pool.query(sqlStr, params);
    const resultInfo = buildResult(pgResult, sqlStr);
    return [pgResult.rows, resultInfo];
  },

  async getConnection() {
    const client = await pool.connect();
    return {
      async query(sql, params = []) {
        let sqlStr = normalizeSql(sql.trim());
        sqlStr = convertPlaceholders(sqlStr);
        if (/^\s*INSERT/i.test(sqlStr) && !/RETURNING/i.test(sqlStr)) {
          sqlStr += ' RETURNING id';
        }
        const pgResult = await client.query(sqlStr, params);
        const resultInfo = buildResult(pgResult, sqlStr);
        return [pgResult.rows, resultInfo];
      },
      release() {
        client.release();
      },
    };
  },
};

pool.on('connect', () => {
  console.log('✓ PostgreSQL Database connected successfully');
});

pool.on('error', (err) => {
  console.error('✗ PostgreSQL Database error:', err.message);
});

// Test connection on startup
pool.query('SELECT NOW()').then(() => {
  console.log('✓ PostgreSQL Database ready');
}).catch((err) => {
  console.error('✗ PostgreSQL Database connection error:', err.message);
});

module.exports = wrappedPool;