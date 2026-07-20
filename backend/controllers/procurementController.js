const db = require('../config/db');
const rao = require('./raoController');
const cashbook = require('./cashbookController');

async function nextRef(table, prefix) {
  const ym = new Date().toISOString().slice(0, 7);
  const [rows] = await db.query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE ref_no LIKE ?`, [`${prefix}-${ym}-%`]);
  const n = String((rows[0]?.n || 0) + 1).padStart(3, '0');
  return `${prefix}-${ym}-${n}`;
}

/* ═══════════════ MODULE 10 — OBLIGATION REQUEST (ObR) ═══════════════
   Creating an ObR immediately commits/obligates the amount against the
   chosen RAO fund — this is the entry point of the automated chain. */
const obr = {
  async list(req, res, next) {
    try { const [rows] = await db.query('SELECT * FROM obligation_requests ORDER BY created_at DESC'); res.json({ requests: rows }); }
    catch (e) { next(e); }
  },
  async create(req, res, next) {
    try {
      const b = req.body;
      if (!b.fund_key || !b.amount || !b.particulars) return res.status(400).json({ message: 'Fund, amount and particulars required' });
      const year = parseInt(b.fiscal_year) || new Date().getFullYear();
      let raoResult;
      try {
        raoResult = await rao.postObligation({
          fundKey: b.fund_key, fiscalYear: year, amount: b.amount, particulars: b.particulars,
          payee: b.payee || '', sourceModule: 'obr', sourceRefId: null,
        });
      } catch (err) { return res.status(400).json({ message: err.message }); }

      const ref = await nextRef('obligation_requests', 'OBR');
      const [r] = await db.query(
        `INSERT INTO obligation_requests (ref_no, fiscal_year, fund_key, entry_date, office, payee, particulars, amount, status, rao_entry_id)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [ref, year, b.fund_key, b.entry_date || new Date(), b.office || '', b.payee || '', b.particulars, b.amount, 'obligated', raoResult.id]
      );
      res.status(201).json({ message: 'Obligation request posted — RAO balance updated', id: r.insertId, ref_no: ref });
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const b = req.body;
      await db.query(`UPDATE obligation_requests SET office=?, payee=?, particulars=? WHERE id=?`,
        [b.office || '', b.payee || '', b.particulars, req.params.id]);
      res.json({ message: 'Updated (amount/fund are locked after obligation — cancel and re-create to change)' });
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try {
      const [rows] = await db.query('SELECT * FROM obligation_requests WHERE id=?', [req.params.id]);
      const o = rows[0];
      if (o?.rao_entry_id) await db.query('DELETE FROM rao_entries WHERE id=?', [o.rao_entry_id]);
      await db.query('DELETE FROM obligation_requests WHERE id=?', [req.params.id]);
      res.json({ message: 'Deleted — RAO obligation reversed' });
    } catch (e) { next(e); }
  },
};

/* ═══════════════ MODULE 11 — PURCHASE REQUEST (PR) ═══════════════ */
const pr = {
  async list(req, res, next) {
    try {
      const [rows] = await db.query(`
        SELECT p.*, o.ref_no AS obr_ref_no, o.fund_key
        FROM purchase_requests p LEFT JOIN obligation_requests o ON o.id = p.obr_id
        ORDER BY p.created_at DESC`);
      res.json({ requests: rows });
    } catch (e) { next(e); }
  },
  async create(req, res, next) {
    try {
      const b = req.body;
      if (!b.obr_id || !b.requested_by) return res.status(400).json({ message: 'Obligation request and requestor required' });
      const items = JSON.stringify(b.items || []);
      const total = (b.items || []).reduce((s,i)=>s+Number(i.qty||0)*Number(i.unit_cost||0), 0);
      const ref = await nextRef('purchase_requests', 'PR');
      const [r] = await db.query(
        `INSERT INTO purchase_requests (ref_no, obr_id, pr_date, requested_by, office, items, purpose, total_amount, status)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [ref, b.obr_id, b.pr_date || new Date(), b.requested_by, b.office || '', items, b.purpose || '', total, 'pending']
      );
      res.status(201).json({ message: 'Purchase request saved', id: r.insertId, ref_no: ref });
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const b = req.body;
      const items = JSON.stringify(b.items || []);
      const total = (b.items || []).reduce((s,i)=>s+Number(i.qty||0)*Number(i.unit_cost||0), 0);
      await db.query(
        `UPDATE purchase_requests SET requested_by=?, office=?, items=?, purpose=?, total_amount=? WHERE id=?`,
        [b.requested_by, b.office || '', items, b.purpose || '', total, req.params.id]
      );
      res.json({ message: 'Updated' });
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try { await db.query('DELETE FROM purchase_requests WHERE id=?', [req.params.id]); res.json({ message: 'Deleted' }); }
    catch (e) { next(e); }
  },
  // Auto-link: generate a Purchase Order from this PR
  async generatePO(req, res, next) {
    try {
      const [rows] = await db.query('SELECT * FROM purchase_requests WHERE id=?', [req.params.id]);
      const p = rows[0];
      if (!p) return res.status(404).json({ message: 'Purchase request not found' });
      const ref = await nextRef('purchase_orders', 'PO');
      const [r] = await db.query(
        `INSERT INTO purchase_orders (ref_no, pr_id, po_date, items, total_amount, status)
         VALUES (?,?,?,?,?,?)`,
        [ref, p.id, new Date(), p.items, p.total_amount, 'pending']
      );
      await db.query(`UPDATE purchase_requests SET status='converted' WHERE id=?`, [p.id]);
      res.status(201).json({ message: 'Purchase order generated from PR', id: r.insertId, ref_no: ref });
    } catch (e) { next(e); }
  },
};

/* ═══════════════ MODULE 12 — PURCHASE ORDER (PO) ═══════════════ */
const po = {
  async list(req, res, next) {
    try {
      const [rows] = await db.query(`
        SELECT po.*, p.ref_no AS pr_ref_no
        FROM purchase_orders po LEFT JOIN purchase_requests p ON p.id = po.pr_id
        ORDER BY po.created_at DESC`);
      res.json({ orders: rows });
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const b = req.body;
      await db.query(
        `UPDATE purchase_orders SET supplier_name=?, supplier_address=?, mode_of_procurement=?, terms=? WHERE id=?`,
        [b.supplier_name || '', b.supplier_address || '', b.mode_of_procurement || 'Shopping', b.terms || '', req.params.id]
      );
      res.json({ message: 'Updated' });
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try { await db.query('DELETE FROM purchase_orders WHERE id=?', [req.params.id]); res.json({ message: 'Deleted' }); }
    catch (e) { next(e); }
  },
  // Auto-link: generate an Inspection & Acceptance Report from this PO
  async generateIAR(req, res, next) {
    try {
      const [rows] = await db.query('SELECT * FROM purchase_orders WHERE id=?', [req.params.id]);
      const p = rows[0];
      if (!p) return res.status(404).json({ message: 'Purchase order not found' });
      const ref = await nextRef('inspection_acceptance_reports', 'IAR');
      const [r] = await db.query(
        `INSERT INTO inspection_acceptance_reports (ref_no, po_id, date_inspected, date_received, items, complete, status)
         VALUES (?,?,?,?,?,?,?)`,
        [ref, p.id, new Date(), new Date(), p.items, true, 'accepted']
      );
      await db.query(`UPDATE purchase_orders SET status='delivered' WHERE id=?`, [p.id]);
      res.status(201).json({ message: 'IAR generated from PO', id: r.insertId, ref_no: ref });
    } catch (e) { next(e); }
  },
};

/* ═══════════════ MODULE 13 — INSPECTION & ACCEPTANCE REPORT (IAR) ═══════════════ */
const iar = {
  async list(req, res, next) {
    try {
      const [rows] = await db.query(`
        SELECT i.*, po.ref_no AS po_ref_no, po.supplier_name, po.total_amount AS po_total
        FROM inspection_acceptance_reports i LEFT JOIN purchase_orders po ON po.id = i.po_id
        ORDER BY i.created_at DESC`);
      res.json({ reports: rows });
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const b = req.body;
      await db.query(
        `UPDATE inspection_acceptance_reports SET inspected_by=?, complete=?, remarks=? WHERE id=?`,
        [b.inspected_by || '', b.complete !== false, b.remarks || '', req.params.id]
      );
      res.json({ message: 'Updated' });
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try { await db.query('DELETE FROM inspection_acceptance_reports WHERE id=?', [req.params.id]); res.json({ message: 'Deleted' }); }
    catch (e) { next(e); }
  },
  // Auto-link: generate a Requisition & Issue Slip from this IAR (for supplies)
  async generateRIS(req, res, next) {
    try {
      const [rows] = await db.query('SELECT * FROM inspection_acceptance_reports WHERE id=?', [req.params.id]);
      const i = rows[0];
      if (!i) return res.status(404).json({ message: 'IAR not found' });
      const ref = await nextRef('requisition_issue_slips', 'RIS');
      const [r] = await db.query(
        `INSERT INTO requisition_issue_slips (ref_no, iar_id, ris_date, items, status)
         VALUES (?,?,?,?,?)`,
        [ref, i.id, new Date(), i.items, 'issued']
      );
      res.status(201).json({ message: 'RIS generated from IAR', id: r.insertId, ref_no: ref });
    } catch (e) { next(e); }
  },
  // Auto-link: generate a Disbursement Voucher from this IAR, tracing back to the originating ObR
  async generateDV(req, res, next) {
    try {
      const [rows] = await db.query(`
        SELECT i.*, po.id AS po_id, po.supplier_name, po.total_amount AS po_total, p.obr_id
        FROM inspection_acceptance_reports i
        LEFT JOIN purchase_orders po ON po.id = i.po_id
        LEFT JOIN purchase_requests p ON p.id = po.pr_id
        WHERE i.id = ?`, [req.params.id]);
      const i = rows[0];
      if (!i) return res.status(404).json({ message: 'IAR not found' });
      const [obrRows] = await db.query('SELECT * FROM obligation_requests WHERE id=?', [i.obr_id]);
      const o = obrRows[0];
      if (!o) return res.status(400).json({ message: 'No linked obligation request found for this chain' });

      const ref = await nextRef('disbursement_vouchers', 'DV');
      const [r] = await db.query(
        `INSERT INTO disbursement_vouchers (ref_no, iar_id, obr_id, dv_date, payee, particulars, amount, fund_key, status)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [ref, i.id, o.id, new Date(), i.supplier_name || o.payee, o.particulars, i.po_total || o.amount, o.fund_key, 'pending']
      );
      res.status(201).json({ message: 'Disbursement voucher generated from IAR', id: r.insertId, ref_no: ref });
    } catch (e) { next(e); }
  },
};

/* ═══════════════ MODULE 14 — REQUISITION & ISSUE SLIP (RIS) ═══════════════ */
const ris = {
  async list(req, res, next) {
    try {
      const [rows] = await db.query(`
        SELECT r.*, i.ref_no AS iar_ref_no
        FROM requisition_issue_slips r LEFT JOIN inspection_acceptance_reports i ON i.id = r.iar_id
        ORDER BY r.created_at DESC`);
      res.json({ slips: rows });
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const b = req.body;
      await db.query(`UPDATE requisition_issue_slips SET requested_by=?, office=?, purpose=? WHERE id=?`,
        [b.requested_by || '', b.office || '', b.purpose || '', req.params.id]);
      res.json({ message: 'Updated' });
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try { await db.query('DELETE FROM requisition_issue_slips WHERE id=?', [req.params.id]); res.json({ message: 'Deleted' }); }
    catch (e) { next(e); }
  },
};

/* ═══════════════ MODULE 15 — DISBURSEMENT VOUCHER (DV) ═══════════════
   Marking a DV as paid posts the disbursement back onto the originating
   RAO obligation entry — closing the automated obligation/disbursement loop. */
const dv = {
  async list(req, res, next) {
    try {
      const [rows] = await db.query(`
        SELECT d.*, o.ref_no AS obr_ref_no
        FROM disbursement_vouchers d LEFT JOIN obligation_requests o ON o.id = d.obr_id
        ORDER BY d.created_at DESC`);
      res.json({ vouchers: rows });
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const b = req.body;
      await db.query(`UPDATE disbursement_vouchers SET payee=?, particulars=?, amount=?, mode_of_payment=?, check_no=? WHERE id=?`,
        [b.payee, b.particulars || '', b.amount || 0, b.mode_of_payment || 'Check', b.check_no || '', req.params.id]);
      res.json({ message: 'Updated' });
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try { await db.query('DELETE FROM disbursement_vouchers WHERE id=?', [req.params.id]); res.json({ message: 'Deleted' }); }
    catch (e) { next(e); }
  },
  async markPaid(req, res, next) {
    try {
      const [rows] = await db.query('SELECT * FROM disbursement_vouchers WHERE id=?', [req.params.id]);
      const d = rows[0];
      if (!d) return res.status(404).json({ message: 'Voucher not found' });
      if (d.status === 'paid') return res.status(400).json({ message: 'Already paid' });
      const [obrRows] = await db.query('SELECT * FROM obligation_requests WHERE id=?', [d.obr_id]);
      const o = obrRows[0];
      if (o?.rao_entry_id) await rao.postDisbursement(o.rao_entry_id, d.amount);
      const { check_no, mode_of_payment } = req.body || {};
      const finalMode = mode_of_payment || d.mode_of_payment;
      const finalCheckNo = check_no || d.check_no;

      await cashbook.postEntry({
        date: new Date(), particulars: `DV ${d.ref_no} — ${d.particulars}`, payeePayor: d.payee,
        receiptAmount: 0, disbursementAmount: d.amount, sourceModule: 'dv', sourceRefId: d.id,
      });
      if (finalMode === 'Check' || finalMode === 'Bank Transfer') {
        await cashbook.postBankEntry({
          date: new Date(), bankName: 'General Fund Account', particulars: `DV ${d.ref_no} — ${d.particulars} (${finalCheckNo || finalMode})`,
          depositAmount: 0, withdrawalAmount: d.amount, sourceModule: 'dv', sourceRefId: d.id,
        });
      }

      await db.query(`UPDATE disbursement_vouchers SET status='paid', paid_date=?, check_no=?, mode_of_payment=? WHERE id=?`,
        [new Date(), finalCheckNo, finalMode, d.id]);
      res.json({ message: 'Voucher marked as paid — RAO, CRDR' + ((finalMode === 'Check' || finalMode === 'Bank Transfer') ? ' and CHBR' : '') + ' updated' });
    } catch (e) { next(e); }
  },
};

module.exports = { obr, pr, po, iar, ris, dv };
