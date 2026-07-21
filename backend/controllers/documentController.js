const db = require('../config/db');
const auditService = require('../services/auditService');
const trashService = require('../services/trashService');
const fs = require('fs');
const path = require('path');

async function getDocuments(req, res, next) {
  try {
    const { resident_id } = req.query;
    let sql = `SELECT d.*, res.first_name || ' ' || res.last_name AS resident_name
               FROM documents d LEFT JOIN residents res ON d.resident_id = res.id WHERE 1=1`;
    const params = [];

    if (resident_id) { params.push(resident_id); sql += ' AND d.resident_id = ?'; }
    sql += ' ORDER BY d.created_at DESC LIMIT 200';

    const [rows] = await db.query(sql, params);
    res.json({ documents: rows });
  } catch (err) {
    next(err);
  }
}

async function uploadDocument(req, res, next) {
  try {
    const { resident_id, document_type, description } = req.body;
    if (!req.file) return res.status(400).json({ error: 'File upload is required' });
    if (!document_type) return res.status(400).json({ error: 'Document type is required' });

    const [result] = await db.query(
      'INSERT INTO documents (resident_id, document_type, file_name, file_path, file_size, description, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [resident_id || null, document_type, req.file.originalname, req.file.path,
       req.file.size || null, description || null, req.user.id]
    );
    await auditService.logAction(req.user.id, 'upload_document', `Uploaded document: ${req.file.originalname}`);
    res.status(201).json({ message: 'Document uploaded', document: { id: result.insertId } });
  } catch (err) {
    next(err);
  }
}

async function deleteDocument(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await db.query('SELECT * FROM documents WHERE id = ?', [id]);
    const doc = existing[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Note: the file on disk is intentionally NOT removed here — it stays put
    // so a restore can still serve it. It's only unlinked on permanent delete
    // or when the trash retention window expires (see trashService.js).
    await trashService.moveToTrash({
      sourceTable: 'documents',
      sourceId: doc.id,
      itemLabel: doc.file_name || `Document ${doc.id}`,
      data: doc,
      userId: req.user.id,
      userName: req.user.full_name || req.user.email,
    });

    await db.query('DELETE FROM documents WHERE id = ?', [id]);
    await auditService.logAction(req.user.id, 'delete_document', `Moved to trash: ${doc.file_name || id}`);
    res.json({ message: 'Document moved to trash' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDocuments, uploadDocument, deleteDocument };