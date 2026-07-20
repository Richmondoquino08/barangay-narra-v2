const db = require('../config/db');

async function getAll(req, res, next) {
  try {
    const [rows] = await db.query(
      'SELECT * FROM barangay_officials ORDER BY sort_order, position, full_name'
    );
    res.json({ officials: rows });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { full_name, position, committee, contact_number, term_start, term_end, sort_order } = req.body;
    if (!full_name || !position) return res.status(400).json({ message: 'Name and position required' });
    const [r] = await db.query(
      'INSERT INTO barangay_officials (full_name, position, committee, contact_number, term_start, term_end, sort_order) VALUES (?,?,?,?,?,?,?)',
      [full_name, position, committee || null, contact_number || null, term_start || null, term_end || null, sort_order || 99]
    );
    res.status(201).json({ message: 'Official added', id: r.insertId });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { full_name, position, committee, contact_number, term_start, term_end, is_active, sort_order } = req.body;
    await db.query(
      `UPDATE barangay_officials SET full_name=?, position=?, committee=?, contact_number=?,
       term_start=?, term_end=?, is_active=?, sort_order=?, updated_at=NOW() WHERE id=?`,
      [full_name, position, committee || null, contact_number || null,
       term_start || null, term_end || null, is_active !== false, sort_order || 99, id]
    );
    res.json({ message: 'Official updated' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await db.query('DELETE FROM barangay_officials WHERE id = ?', [req.params.id]);
    res.json({ message: 'Official deleted' });
  } catch (err) { next(err); }
}

module.exports = { getAll, create, update, remove };