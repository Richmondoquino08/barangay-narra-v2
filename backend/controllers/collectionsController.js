const db = require('../config/db');
const cashbook = require('./cashbookController');

async function nextRef(table, prefix) {
  const ym = new Date().toISOString().slice(0, 7);
  const [rows] = await db.query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE ref_no LIKE ?`, [`${prefix}-${ym}-%`]);
  const n = String((rows[0]?.n || 0) + 1).padStart(3, '0');
  return `${prefix}-${ym}-${n}`;
}

/* ═══════════════ MODULE 9 — ITEMIZED COLLECTIONS ═══════════════
   Every collection auto-posts a receipt leg to the CRDR cashbook; if marked
   "deposited" it also auto-posts a deposit leg to the CHBR bank register. */
async function list(req, res, next) {
  try {
    const [rows] = await db.query('SELECT * FROM collection_items ORDER BY collection_date DESC, id DESC');
    res.json({ collections: rows });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const b = req.body;
    if (!b.payor || !b.amount || !b.revenue_source) return res.status(400).json({ message: 'Payor, revenue source and amount required' });

    const ref = await nextRef('collection_items', 'COL');
    const particulars = `Collection from ${b.payor} — ${b.revenue_source}`;

    const crdrEntry = await cashbook.postEntry({
      date: b.collection_date, particulars, payeePayor: b.payor,
      receiptAmount: b.amount, disbursementAmount: 0,
      sourceModule: 'collection', sourceRefId: null,
    });

    let chbrEntry = null;
    if (b.deposited) {
      chbrEntry = await cashbook.postBankEntry({
        date: b.collection_date, bankName: b.bank_name, particulars,
        depositAmount: b.amount, withdrawalAmount: 0,
        sourceModule: 'collection', sourceRefId: null,
      });
    }

    const [r] = await db.query(
      `INSERT INTO collection_items (ref_no, collection_date, collected_by, payor, revenue_source, or_no, amount, remarks, deposited, bank_name, crdr_entry_id, chbr_entry_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [ref, b.collection_date || new Date(), b.collected_by || '', b.payor, b.revenue_source, b.or_no || '',
       b.amount, b.remarks || '', !!b.deposited, b.bank_name || '', crdrEntry.id, chbrEntry?.id || null]
    );
    res.status(201).json({ message: 'Collection posted — CRDR updated' + (chbrEntry ? ' and deposited to CHBR' : ''), id: r.insertId, ref_no: ref });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const b = req.body;
    await db.query(`UPDATE collection_items SET collected_by=?, remarks=? WHERE id=?`,
      [b.collected_by || '', b.remarks || '', req.params.id]);
    res.json({ message: 'Updated (amount/deposit status locked after posting)' });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const [rows] = await db.query('SELECT * FROM collection_items WHERE id=?', [req.params.id]);
    const c = rows[0];
    if (c?.crdr_entry_id) await db.query('DELETE FROM crdr_entries WHERE id=?', [c.crdr_entry_id]);
    if (c?.chbr_entry_id) await db.query('DELETE FROM chbr_entries WHERE id=?', [c.chbr_entry_id]);
    await db.query('DELETE FROM collection_items WHERE id=?', [req.params.id]);
    res.json({ message: 'Deleted — CRDR/CHBR postings reversed' });
  } catch (e) { next(e); }
}

module.exports = { list, create, update, remove };
