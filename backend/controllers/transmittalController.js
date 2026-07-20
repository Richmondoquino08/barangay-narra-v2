const db = require('../config/db');

async function nextRef() {
  const ym = new Date().toISOString().slice(0, 7);
  const [rows] = await db.query(`SELECT COUNT(*)::int AS n FROM transmittal_letters WHERE ref_no LIKE ?`, [`TL-${ym}-%`]);
  const n = String((rows[0]?.n || 0) + 1).padStart(3, '0');
  return `TL-${ym}-${n}`;
}

/* ═══════════════ MODULE 19 — TRANSMITTAL LETTER ═══════════════
   Cover letter for forwarding documents/reports to another office.
   "documents" is a free-form JSON list of {type, ref_no, description}
   so it can reference any prior module (DV, PO, IAR, reports, etc). */
async function list(req, res, next) {
  try {
    const [rows] = await db.query('SELECT * FROM transmittal_letters ORDER BY letter_date DESC, id DESC');
    res.json({ letters: rows });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const b = req.body;
    if (!b.addressee || !b.subject) return res.status(400).json({ message: 'Addressee and subject required' });
    const ref = await nextRef();
    const documents = JSON.stringify(b.documents || []);
    const [r] = await db.query(
      `INSERT INTO transmittal_letters (ref_no, letter_date, addressee, office_address, subject, documents, prepared_by, status)
       VALUES (?,?,?,?,?,?,?,?)`,
      [ref, b.letter_date || new Date(), b.addressee, b.office_address || '', b.subject, documents, b.prepared_by || '', 'sent']
    );
    res.status(201).json({ message: 'Transmittal letter saved', id: r.insertId, ref_no: ref });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const b = req.body;
    const documents = JSON.stringify(b.documents || []);
    await db.query(
      `UPDATE transmittal_letters SET addressee=?, office_address=?, subject=?, documents=?, prepared_by=?, status=? WHERE id=?`,
      [b.addressee, b.office_address || '', b.subject, documents, b.prepared_by || '', b.status || 'sent', req.params.id]
    );
    res.json({ message: 'Updated' });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try { await db.query('DELETE FROM transmittal_letters WHERE id=?', [req.params.id]); res.json({ message: 'Deleted' }); }
  catch (e) { next(e); }
}

module.exports = { list, create, update, remove };
