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
      primary_color, system_name, login_tagline,
      signatory_name, signatory_title, monthly_collection_target,
      logo_url, background_url, login_bg_url, font_size,
      province, city_municipality, right_logo_url,
      secretary_name, secretary_title, cert_validity,
      treasurer_name, treasurer_title,
      role_permissions
    } = req.body;

    const [existing] = await db.query('SELECT id FROM system_settings LIMIT 1');

    if (existing.length) {
      await db.query(
        `UPDATE system_settings SET
           barangay_name              = ?,
           address                    = ?,
           captain                    = ?,
           officials                  = ?,
           primary_color              = ?,
           system_name                = ?,
           login_tagline              = ?,
           signatory_name             = ?,
           signatory_title            = ?,
           monthly_collection_target  = ?,
           logo_url                   = ?,
           background_url             = ?,
           login_bg_url               = ?,
           font_size                  = ?,
           province                   = ?,
           city_municipality          = ?,
           right_logo_url             = ?,
           secretary_name             = ?,
           secretary_title            = ?,
           cert_validity              = ?,
           treasurer_name             = ?,
           treasurer_title            = ?,
           role_permissions           = ?,
           updated_at                 = NOW()
         WHERE id = ?`,
        [
          barangay_name  ?? 'Barangay Narra',
          address        ?? '',
          captain        ?? '',
          officials      ?? '[]',
          primary_color  ?? '#4F46E5',
          system_name    ?? 'Barangay Management System',
          login_tagline  ?? 'Official Records & Services Portal',
          signatory_name ?? '',
          signatory_title ?? 'Punong Barangay',
          monthly_collection_target ?? 0,
          logo_url       ?? '',
          background_url ?? '',
          login_bg_url   ?? '',
          font_size      ?? 'medium',
          province       ?? '',
          city_municipality ?? '',
          right_logo_url ?? '',
          secretary_name ?? '',
          secretary_title ?? 'Barangay Secretary',
          cert_validity  ?? 'Valid for three (3) months only',
          treasurer_name ?? '',
          treasurer_title ?? 'Barangay Treasurer',
          role_permissions ? (typeof role_permissions === 'string' ? role_permissions : JSON.stringify(role_permissions)) : null,
          existing[0].id,
        ]
      );
    } else {
      await db.query(
        `INSERT INTO system_settings
           (barangay_name, address, captain, officials, primary_color, system_name, login_tagline,
            signatory_name, signatory_title, monthly_collection_target,
            logo_url, background_url, login_bg_url, font_size)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          barangay_name  || 'Barangay Narra',
          address        || '',
          captain        || '',
          officials      || '[]',
          primary_color  || '#4F46E5',
          system_name    || 'Barangay Management System',
          login_tagline  || 'Official Records & Services Portal',
          signatory_name || '',
          signatory_title || 'Punong Barangay',
          monthly_collection_target || 0,
          logo_url       || '',
          background_url || '',
          login_bg_url   || '',
          font_size      || 'medium',
        ]
      );
    }

    if (req.user) {
      await auditService.logAction(req.user.id, 'update_settings', 'Updated barangay settings');
    }
    res.json({ message: 'Settings saved successfully' });
  } catch (err) { next(err); }
}

const ASSET_COLUMNS = {
  'logo':       'logo_url',
  'background': 'background_url',
  'login-bg':   'login_bg_url',
  'right-logo': 'right_logo_url',
};

async function clearAsset(req, res, next) {
  try {
    const { type } = req.params;
    const column = ASSET_COLUMNS[type];
    if (!column) {
      return res.status(400).json({ message: 'Invalid type. Use "logo", "background", or "login-bg".' });
    }
    const [existing] = await db.query('SELECT id FROM system_settings LIMIT 1');
    if (existing.length) {
      await db.query(`UPDATE system_settings SET ${column} = '', updated_at = NOW() WHERE id = ?`, [existing[0].id]);
    }
    if (req.user) {
      await auditService.logAction(req.user.id, `clear_${type}`, `Cleared ${type}`);
    }
    res.json({ message: `${type} cleared` });
  } catch (err) { next(err); }
}

async function uploadAsset(req, res, next) {
  try {
    const { type } = req.params;
    const column = ASSET_COLUMNS[type];
    if (!column) {
      return res.status(400).json({ message: 'Invalid asset type. Use "logo", "background", or "login-bg".' });
    }
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

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

module.exports = { getSettings, saveSettings, uploadAsset, clearAsset };
