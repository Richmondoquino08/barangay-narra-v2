const db = require('../config/db');

async function getAuditLogs(req, res, next) {
  try {
    const [rows] = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200');
    res.json({ logs: rows });
  } catch (err) {
    next(err);
  }
}

async function loginHistory(req, res, next) {
  try {
    const [rows] = await db.query("SELECT id, user_id, action, details, created_at FROM audit_logs WHERE action = 'login' ORDER BY created_at DESC LIMIT 100");
    res.json({ history: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAuditLogs, loginHistory };
