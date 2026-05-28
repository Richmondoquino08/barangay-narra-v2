const db = require('../config/db');
const auditService = require('../services/auditService');

async function getDocuments(req, res, next) {
  try {
    const [rows] = await db.query('SELECT * FROM documents ORDER BY created_at DESC LIMIT 200');
    res.json({ documents: rows });
  } catch (err) {
    next(err);
  }
}

async function uploadDocument(req, res, next) {
  try {
    const { resident_id, description } = req.body;
    if (!req.file) return res.status(400).json({ error: 'File upload is required' });
    
    const [result] = await db.query(
      'INSERT INTO documents (resident_id, filename, original_name, description, uploaded_by) VALUES (?, ?, ?, ?, ?)',
      [resident_id || null, req.file.filename, req.file.originalname, description || '', req.user.id]
    );
    await auditService.logAction(req.user.id, 'upload_document', `Uploaded document ${req.file.originalname}`);
    res.status(201).json({ 
      message: 'Document uploaded',
      document: { id: result.insertId }
    });
  } catch (err) {
    next(err);
  }
}

async function deleteDocument(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await db.query('SELECT filename FROM documents WHERE id = ?', [id]);
    if (!existing[0]) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    await db.query('DELETE FROM documents WHERE id = ?', [id]);
    await auditService.logAction(req.user.id, 'delete_document', `Deleted document ${id}`);
    res.json({ message: 'Document deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDocuments, uploadDocument, deleteDocument };
