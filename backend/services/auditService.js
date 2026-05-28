const db = require('../config/db');

async function logAction(userId, action, details) {
  try {
    await db.query(
      'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, action, details]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = { logAction };