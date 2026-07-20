const db = require('../config/db');
const auditService = require('../services/auditService');

async function getAnnouncements(req, res, next) {
  try {
    const [rows] = await db.query(`
      SELECT a.*, u.full_name AS posted_by_name, u.role AS posted_by_role
      FROM announcements a
      LEFT JOIN users u ON a.posted_by = u.id
      ORDER BY a.created_at DESC LIMIT 50
    `);
    res.json({ announcements: rows });
  } catch (err) {
    next(err);
  }
}

async function createAnnouncement(req, res, next) {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }
    const [result] = await db.query(
      'INSERT INTO announcements (title, message, posted_by) VALUES (?, ?, ?)',
      [title, message, req.user.id]
    );
    await auditService.logAction(req.user.id, 'create_announcement', `Posted announcement: ${title}`);
    res.status(201).json({
      message: 'Announcement created',
      announcement: { id: result.insertId, title, message }
    });
  } catch (err) {
    next(err);
  }
}

async function updateAnnouncement(req, res, next) {
  try {
    const { id } = req.params;
    const { title, message } = req.body;

    const [existing] = await db.query('SELECT id FROM announcements WHERE id = ?', [id]);
    if (!existing[0]) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    await db.query(
      'UPDATE announcements SET title = ?, message = ?, updated_at = NOW() WHERE id = ?',
      [title, message, id]
    );
    await auditService.logAction(req.user.id, 'update_announcement', `Updated announcement ${id}`);
    res.json({ message: 'Announcement updated' });
  } catch (err) {
    next(err);
  }
}

async function deleteAnnouncement(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await db.query('SELECT id FROM announcements WHERE id = ?', [id]);
    if (!existing[0]) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    await db.query('DELETE FROM announcements WHERE id = ?', [id]);
    await auditService.logAction(req.user.id, 'delete_announcement', `Deleted announcement ${id}`);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement };