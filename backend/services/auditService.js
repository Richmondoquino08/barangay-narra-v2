const db = require('../config/db');

async function logAction(userId, action, details) {
  await db.query('INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)', [userId, action, details]);
}

module.exports = { logAction };
