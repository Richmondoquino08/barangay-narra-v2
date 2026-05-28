const db = require('../config/db');
const auditService = require('../services/auditService');

async function getAnnouncements(req, res, next) {
  try {
    const [rows] = await db.query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 50');
    res.json({ announcements: rows });
  } catch (err) {
    next(err);
  }
}

async function createAnnouncement(req, res, next) {
  try {
    const { title, message } = req.body;
    const [result] = await db.query(
      'INSERT INTO announcements (title, message, posted_by) VALUES (?, ?, ?)',
      [title, message, req.user.id]
    );
    await auditService.logAction(req.user.id, 'create_announcement', `Posted announcement ${title}`);
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
