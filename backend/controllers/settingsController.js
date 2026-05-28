const db = require('../config/db');
const auditService = require('../services/auditService');

async function getSettings(req, res, next) {
  try {
    const [rows] = await db.query('SELECT * FROM system_settings LIMIT 1');
    res.json(rows[0] || {});
  } catch (err) { next(err); }
}

async function saveSettings(req, res, next) {
  try {
    const {
      barangay_name, address, captain, officials,
      primary_color, system_name, login_tagline
    } = req.body;

    const [existing] = await db.query('SELECT id FROM system_settings LIMIT 1');

    if (existing.length) {
      // Direct UPDATE — always write every field (no COALESCE guessing)
      await db.query(
        `UPDATE system_settings SET
           barangay_name = ?,
           address       = ?,
           captain       = ?,
           officials     = ?,
           primary_color = ?,
           system_name   = ?,
           login_tagline = ?,
           updated_at    = NOW()
         WHERE id = ?`,
        [
          barangay_name   ?? 'Barangay Narra',
          address         ?? '',
          captain         ?? '',
          officials       ?? '[]',
          primary_color   ?? '#4F46E5',
          system_name     ?? 'Barangay Management System',
          login_tagline   ?? 'Official Records & Services Portal',
          existing[0].id,
        ]
      );
    } else {
      await db.query(
        `INSERT INTO system_settings
           (barangay_name, address, captain, officials, primary_color, system_name, login_tagline)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          barangay_name   || 'Barangay Narra',
          address         || '',
          captain         || '',
          officials       || '[]',
          primary_color   || '#4F46E5',
          system_name     || 'Barangay Management System',
          login_tagline   || 'Official Records & Services Portal',
        ]
      );
    }

    if (req.user) {
      await auditService.logAction(req.user.id, 'update_settings', 'Updated barangay settings');
    }
    res.json({ message: 'Settings saved successfully' });
  } catch (err) { next(err); }
}

async function uploadAsset(req, res, next) {
  try {
    const { type } = req.params;
    if (!['logo', 'background'].includes(type)) {
      return res.status(400).json({ message: 'Invalid asset type. Use "logo" or "background".' });
    }
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const column  = type === 'logo' ? 'logo_url' : 'background_url';
    const fileUrl = `/uploads/settings/${req.file.filename}`;

    const [existing] = await db.query('SELECT id FROM system_settings LIMIT 1');
    if (existing.length) {
      await db.query(`UPDATE system_settings SET ${column} = ?, updated_at = NOW() WHERE id = ?`,
        [fileUrl, existing[0].id]);
    } else {
      await db.query(`INSERT INTO system_settings (${column}) VALUES (?)`, [fileUrl]);
    }

    if (req.user) {
      await auditService.logAction(req.user.id, `upload_${type}`, `Uploaded new ${type}: ${req.file.filename}`);
    }
    res.json({ message: `${type} uploaded successfully`, url: fileUrl });
  } catch (err) { next(err); }
}

module.exports = { getSettings, saveSettings, uploadAsset };
