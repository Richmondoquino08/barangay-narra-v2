const db = require('../config/db');

async function nextRef(table, prefix) {
  const ym = new Date().toISOString().slice(0, 7);
  const [rows] = await db.query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE ref_no LIKE ?`, [`${prefix}-${ym}-%`]);
  const n = String((rows[0]?.n || 0) + 1).padStart(3, '0');
  return `${prefix}-${ym}-${n}`;
}

/* ═══════════════ MODULE 6 — CASH RECEIPTS & DISBURSEMENTS RECORD (CRDR) ═══════════════
   Combined chronological cashbook. Other modules (Itemized Collections, Disbursement
   Vouchers) post into this automatically via postEntry() — manual entries are also allowed. */
const crdr = {
  async list(req, res, next) {
    try {
      const [rows] = await db.query(`
        SELECT *, SUM(receipt_amount - disbursement_amount) OVER (ORDER BY entry_date, id) AS running_balance
        FROM crdr_entries ORDER BY entry_date DESC, id DESC`);
      res.json({ entries: rows });
    } catch (e) { next(e); }
  },
  async create(req, res, next) {
    try {
      const b = req.body;
      const id = await postEntry({
        date: b.entry_date, particulars: b.particulars, payeePayor: b.payee_payor,
        receiptAmount: b.receipt_amount || 0, disbursementAmount: b.disbursement_amount || 0,
        sourceModule: 'manual', sourceRefId: null,
      });
      res.status(201).json({ message: 'CRDR entry posted', ...id });
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const b = req.body;
      await db.query(`UPDATE crdr_entries SET particulars=?, payee_payor=? WHERE id=?`,
        [b.particulars || '', b.payee_payor || '', req.params.id]);
      res.json({ message: 'Updated (amounts are locked once posted)' });
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try { await db.query('DELETE FROM crdr_entries WHERE id=?', [req.params.id]); res.json({ message: 'Deleted' }); }
    catch (e) { next(e); }
  },
};
async function postEntry({ date, particulars, payeePayor, receiptAmount = 0, disbursementAmount = 0, sourceModule, sourceRefId }) {
  const ref = await nextRef('crdr_entries', 'CRDR');
  const [r] = await db.query(
    `INSERT INTO crdr_entries (ref_no, entry_date, particulars, payee_payor, receipt_amount, disbursement_amount, source_module, source_ref_id)
     VALUES (?,?,?,?,?,?,?,?)`,
    [ref, date || new Date(), particulars || '', payeePayor || '', receiptAmount, disbursementAmount, sourceModule || '', sourceRefId || null]
  );
  return { id: r.insertId, ref_no: ref };
}

/* ═══════════════ MODULE 7 — CASH IN BANK REGISTER (CHBR) ═══════════════
   Per-bank deposit/withdrawal ledger. Itemized Collections post deposits when marked
   "deposited"; paid Disbursement Vouchers (Check/Bank Transfer) post withdrawals. */
const chbr = {
  async list(req, res, next) {
    try {
      const bank = req.query.bank;
      const [rows] = await db.query(`
        SELECT *, SUM(deposit_amount - withdrawal_amount) OVER (PARTITION BY bank_name ORDER BY entry_date, id) AS running_balance
        FROM chbr_entries ${bank ? 'WHERE bank_name = ?' : ''} ORDER BY entry_date DESC, id DESC`,
        bank ? [bank] : []);
      res.json({ entries: rows });
    } catch (e) { next(e); }
  },
  async banks(req, res, next) {
    try {
      const [rows] = await db.query(`
        SELECT bank_name, SUM(deposit_amount - withdrawal_amount) AS balance
        FROM chbr_entries GROUP BY bank_name ORDER BY bank_name`);
      res.json({ banks: rows });
    } catch (e) { next(e); }
  },
  async create(req, res, next) {
    try {
      const b = req.body;
      const id = await postBankEntry({
        date: b.entry_date, bankName: b.bank_name, accountNo: b.account_no, particulars: b.particulars,
        depositAmount: b.deposit_amount || 0, withdrawalAmount: b.withdrawal_amount || 0,
        sourceModule: 'manual', sourceRefId: null,
      });
      res.status(201).json({ message: 'CHBR entry posted', ...id });
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const b = req.body;
      await db.query(`UPDATE chbr_entries SET particulars=?, bank_name=?, account_no=? WHERE id=?`,
        [b.particulars || '', b.bank_name || '', b.account_no || '', req.params.id]);
      res.json({ message: 'Updated (amounts are locked once posted)' });
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try { await db.query('DELETE FROM chbr_entries WHERE id=?', [req.params.id]); res.json({ message: 'Deleted' }); }
    catch (e) { next(e); }
  },
};
async function postBankEntry({ date, bankName, accountNo, particulars, depositAmount = 0, withdrawalAmount = 0, sourceModule, sourceRefId }) {
  const ref = await nextRef('chbr_entries', 'CHBR');
  const [r] = await db.query(
    `INSERT INTO chbr_entries (ref_no, entry_date, bank_name, account_no, particulars, deposit_amount, withdrawal_amount, source_module, source_ref_id)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [ref, date || new Date(), bankName || '', accountNo || '', particulars || '', depositAmount, withdrawalAmount, sourceModule || '', sourceRefId || null]
  );
  return { id: r.insertId, ref_no: ref };
}

/* ═══════════════ MODULE 8 — SUMMARY/SCHEDULE OF CHECKS ISSUED (SCkI) ═══════════════
   Fully derived report — no table of its own. Pulled live from paid Disbursement
   Vouchers so it can never drift out of sync with the procurement chain. */
async function checksIssued(req, res, next) {
  try {
    const { from, to } = req.query;
    let sql = `
      SELECT d.id, d.ref_no AS dv_ref_no, d.dv_date, d.paid_date, d.payee, d.particulars,
             d.amount, d.check_no, d.fund_key, d.obr_id, o.ref_no AS obr_ref_no
      FROM disbursement_vouchers d LEFT JOIN obligation_requests o ON o.id = d.obr_id
      WHERE d.status = 'paid' AND d.mode_of_payment = 'Check'`;
    const params = [];
    if (from) { sql += ' AND d.paid_date >= ?'; params.push(from); }
    if (to)   { sql += ' AND d.paid_date <= ?'; params.push(to); }
    sql += ' ORDER BY d.paid_date DESC, d.id DESC';
    const [rows] = await db.query(sql, params);
    const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
    res.json({ checks: rows, total });
  } catch (e) { next(e); }
}

module.exports = { crdr, chbr, checksIssued, postEntry, postBankEntry };
