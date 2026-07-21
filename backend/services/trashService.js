const db = require('../config/db');
const fs = require('fs');

const RETENTION_DAYS = 30;

// Column lists used to reconstruct an explicit INSERT on restore, so the
// restored row (including its original id) matches exactly what was deleted.
// Keep in sync with the actual table schema if either table changes shape.
const TABLE_COLUMNS = {
  certificates: [
    'id', 'resident_id', 'certificate_type', 'template_id', 'purpose', 'issue_date', 'valid_until',
    'status', 'approved_by', 'generated_file_path', 'qr_code_data', 'created_by', 'created_at',
    'updated_at', 'or_number', 'fee', 'or_date', 'custom_fields',
  ],
  documents: [
    'id', 'resident_id', 'document_type', 'file_name', 'file_path', 'file_size', 'uploaded_by',
    'description', 'created_at', 'updated_at',
  ],
};
const JSONB_COLUMNS = new Set(['custom_fields']);

function fileFieldFor(sourceTable) {
  return sourceTable === 'documents' ? 'file_path' : null;
}

async function moveToTrash({ sourceTable, sourceId, itemLabel, data, userId, userName }) {
  await db.query(
    `INSERT INTO trash_bin (source_table, source_id, item_label, data, deleted_by, deleted_by_name)
     VALUES (?, ?, ?, ?::jsonb, ?, ?)`,
    [sourceTable, sourceId, itemLabel, JSON.stringify(data), userId || null, userName || 'Unknown']
  );
}

async function getUserTrash(userId) {
  const [rows] = await db.query(
    `SELECT * FROM trash_bin WHERE deleted_by = ? AND hidden_by_user = FALSE ORDER BY deleted_at DESC`,
    [userId]
  );
  return rows;
}

async function getAllTrash() {
  const [rows] = await db.query(`SELECT * FROM trash_bin ORDER BY deleted_at DESC`);
  return rows;
}

async function hideForUser(trashId, userId) {
  // db.query returns [rows, resultInfo] — affectedRows lives on the second
  // element, not the first (which is just the returned rows, empty for a
  // plain UPDATE with no RETURNING).
  const [, info] = await db.query(
    `UPDATE trash_bin SET hidden_by_user = TRUE WHERE id = ? AND deleted_by = ?`,
    [trashId, userId]
  );
  return info.affectedRows > 0;
}

async function restoreItem(trashId) {
  const [rows] = await db.query('SELECT * FROM trash_bin WHERE id = ?', [trashId]);
  const item = rows[0];
  if (!item) return { success: false, message: 'Trash item not found' };

  const columns = TABLE_COLUMNS[item.source_table];
  if (!columns) return { success: false, message: 'Unsupported item type' };

  const data = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
  const values = columns.map(c => {
    const v = data[c];
    return JSONB_COLUMNS.has(c) && v && typeof v === 'object' ? JSON.stringify(v) : v;
  });
  const placeholders = columns.map(c => (JSONB_COLUMNS.has(c) ? '?::jsonb' : '?')).join(', ');

  await db.query(
    `INSERT INTO ${item.source_table} (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );
  await db.query('DELETE FROM trash_bin WHERE id = ?', [trashId]);
  return { success: true, item };
}

async function permanentlyDelete(trashId) {
  const [rows] = await db.query('SELECT * FROM trash_bin WHERE id = ?', [trashId]);
  const item = rows[0];
  if (!item) return { success: false, message: 'Trash item not found' };

  const fileField = fileFieldFor(item.source_table);
  if (fileField) {
    const data = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
    const filePath = data[fileField];
    try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
  }

  await db.query('DELETE FROM trash_bin WHERE id = ?', [trashId]);
  return { success: true, item };
}

// Auto-purge anything past the retention window — runs regardless of the
// hidden_by_user flag, since that flag only controls what a normal user sees,
// not how long data actually stays recoverable.
async function purgeExpired() {
  const [rows] = await db.query(
    `SELECT * FROM trash_bin WHERE deleted_at < NOW() - INTERVAL '${RETENTION_DAYS} days'`
  );
  for (const item of rows) {
    const fileField = fileFieldFor(item.source_table);
    if (fileField) {
      const data = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
      const filePath = data[fileField];
      try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
    }
  }
  if (rows.length > 0) {
    await db.query(`DELETE FROM trash_bin WHERE deleted_at < NOW() - INTERVAL '${RETENTION_DAYS} days'`);
    console.log(`[trash] Auto-purged ${rows.length} expired item(s) past ${RETENTION_DAYS}-day retention.`);
  }
  return rows.length;
}

module.exports = {
  RETENTION_DAYS,
  moveToTrash,
  getUserTrash,
  getAllTrash,
  hideForUser,
  restoreItem,
  permanentlyDelete,
  purgeExpired,
};
