const db = require('../config/db');
const auditService = require('../services/auditService');

async function getSettings(req, res, next) {
  try {
    const [rows] = await db.query('SELECT * FROM system_settings LIMIT 1');
    res.json(rows[0] || {});
  } catch (err) {
    next(err);
  }
}

async function saveSettings(req, res, next) {
  try {
    const { barangay_name, address, captain, officials, logo_url } = req.body;
    const [existing] = await db.query('SELECT id FROM system_settings LIMIT 1');
    if (existing.length) {
      await db.query(
        'UPDATE system_settings SET barangay_name = ?, address = ?, captain = ?, officials = ?, logo_url = ?, updated_at = NOW() WHERE id = ?',
        [barangay_name, address, captain, officials || '[]', logo_url || '', existing[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO system_settings (barangay_name, address, captain, officials, logo_url) VALUES (?,?,?,?,?)',
        [barangay_name, address, captain, officials || '[]', logo_url || '']
      );
    }
    await auditService.logAction(req.user.id, 'update_settings', 'Updated barangay profile settings');
    res.json({ message: 'Settings saved' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSettings, saveSettings };
