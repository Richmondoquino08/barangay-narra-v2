const db = require('../config/db');
const trashService = require('../services/trashService');
const auditService = require('../services/auditService');

async function getMyTrash(req, res, next) {
  try {
    const rows = await trashService.getUserTrash(req.user.id);
    res.json({ success: true, items: rows, retentionDays: trashService.RETENTION_DAYS });
  } catch (err) { next(err); }
}

async function getAllTrash(req, res, next) {
  try {
    const rows = await trashService.getAllTrash();
    res.json({ success: true, items: rows, retentionDays: trashService.RETENTION_DAYS });
  } catch (err) { next(err); }
}

async function restore(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM trash_bin WHERE id = ?', [id]);
    const item = rows[0];
    if (!item) return res.status(404).json({ success: false, message: 'Trash item not found' });

    // Non-admins may only restore items they personally deleted.
    if (req.user.role !== 'admin' && item.deleted_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only restore items you deleted' });
    }

    const result = await trashService.restoreItem(id);
    if (!result.success) return res.status(400).json(result);

    await auditService.logAction(req.user.id, 'restore_from_trash',
      `Restored ${item.source_table} "${item.item_label}" (originally deleted by ${item.deleted_by_name})`);
    res.json({ success: true, message: 'Item restored' });
  } catch (err) { next(err); }
}

// Normal user's own "delete from trash" — hides it from their view only.
// This intentionally does NOT remove the item from trash_bin: admin must
// still be able to see and recover it. See docs/CHANGELOG.md for why.
async function hide(req, res, next) {
  try {
    const { id } = req.params;
    const ok = await trashService.hideForUser(id, req.user.id);
    if (!ok) return res.status(404).json({ success: false, message: 'Trash item not found' });
    res.json({ success: true, message: 'Removed from your trash' });
  } catch (err) { next(err); }
}

// Admin-only true permanent delete.
async function permanentDelete(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM trash_bin WHERE id = ?', [id]);
    const item = rows[0];
    if (!item) return res.status(404).json({ success: false, message: 'Trash item not found' });

    await trashService.permanentlyDelete(id);
    await auditService.logAction(req.user.id, 'permanent_delete',
      `Permanently deleted ${item.source_table} "${item.item_label}" (originally deleted by ${item.deleted_by_name})`);
    res.json({ success: true, message: 'Permanently deleted' });
  } catch (err) { next(err); }
}

module.exports = { getMyTrash, getAllTrash, restore, hide, permanentDelete };
