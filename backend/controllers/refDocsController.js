const db = require('../config/db');
const path = require('path');
const fs = require('fs');

async function getAll(req, res, next) {
  try {
    const [rows] = await db.query(
      'SELECT id, doc_name, description, file_path, file_type, file_size, created_at FROM reference_documents ORDER BY created_at DESC'
    );
    res.json({ documents: rows });
  } catch (err) { next(err); }
}

async function upload(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { doc_name, description } = req.body;
    if (!doc_name) return res.status(400).json({ message: 'Document name required' });
    const fileUrl = `/uploads/ref-docs/${req.file.filename}`;
    const [r] = await db.query(
      `INSERT INTO reference_documents (doc_name, description, file_path, file_type, file_size, uploaded_by)
       VALUES (?,?,?,?,?,?)`,
      [doc_name, description || null, fileUrl, req.file.mimetype, req.file.size, req.user.id]
    );
    res.status(201).json({ message: 'Document uploaded', id: r.insertId, url: fileUrl });
  } catch (err) { next(err); }
}

async function download(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM reference_documents WHERE id = ?', [id]);
    if (!rows[0]) return res.status(404).json({ message: 'Not found' });
    const filePath = path.join(__dirname, '..', rows[0].file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found on server' });
    res.download(filePath, rows[0].doc_name + path.extname(rows[0].file_path));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT file_path FROM reference_documents WHERE id = ?', [id]);
    if (rows[0]) {
      try {
        const fp = path.join(__dirname, '..', rows[0].file_path);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      } catch (_) {}
      await db.query('DELETE FROM reference_documents WHERE id = ?', [id]);
    }
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
}

module.exports = { getAll, upload, download, remove };
