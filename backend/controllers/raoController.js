const db = require('../config/db');

// The 9 statutory funds declared in barangay_budget (Finance > Budget Management)
const FUNDS = [
  { key: 'general_fund',    label: 'General Fund' },
  { key: 'dev_fund_20pct',  label: '20% Development Fund' },
  { key: 'drrm_fund_5pct',  label: 'BDRRM Fund' },
  { key: 'special_fund',    label: 'Special Fund' },
  { key: 'sk_fund',         label: 'SK Fund' },
  { key: 'gad_fund',        label: 'GAD Fund' },
  { key: 'lcpc_fund',       label: 'LCPC Programs' },
  { key: 'ps_budget',       label: 'PS Budget' },
  { key: 'debt_service',    label: 'Debt Service' },
];
const FUND_KEYS = FUNDS.map(f => f.key);

async function nextRef() {
  const ym = new Date().toISOString().slice(0, 7);
  const [rows] = await db.query(`SELECT COUNT(*)::int AS n FROM rao_entries WHERE ref_no LIKE ?`, [`RAO-${ym}-%`]);
  const n = String((rows[0]?.n || 0) + 1).padStart(3, '0');
  return `RAO-${ym}-${n}`;
}

// ── Fund summary across all 9 funds for a fiscal year ──
async function summary(req, res, next) {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const [budgetRows] = await db.query('SELECT * FROM barangay_budget WHERE fiscal_year = ?', [year]);
    const budget = budgetRows[0] || null;

    const [totals] = await db.query(
      `SELECT fund_key,
              COALESCE(SUM(obligation_amount),0)::float   AS obligated,
              COALESCE(SUM(disbursement_amount),0)::float AS disbursed
       FROM rao_entries WHERE fiscal_year = ? GROUP BY fund_key`, [year]
    );
    const totalsMap = {};
    totals.forEach(t => { totalsMap[t.fund_key] = t; });

    const funds = FUNDS.map(f => {
      const appropriation = Number(budget?.[f.key] || 0);
      const obligated = Number(totalsMap[f.key]?.obligated || 0);
      const disbursed = Number(totalsMap[f.key]?.disbursed || 0);
      return {
        key: f.key,
        label: f.label,
        appropriation,
        obligated,
        disbursed,
        balance: appropriation - obligated,
        unpaidObligations: obligated - disbursed,
      };
    });

    res.json({ year, hasBudget: !!budget, funds });
  } catch (e) { next(e); }
}

// ── Ledger entries for one fund / year ──
async function list(req, res, next) {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const fundKey = req.query.fund_key;
    let sql = 'SELECT * FROM rao_entries WHERE fiscal_year = ?';
    const params = [year];
    if (fundKey) { sql += ' AND fund_key = ?'; params.push(fundKey); }
    sql += ' ORDER BY entry_date DESC, created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json({ entries: rows });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const b = req.body;
    if (!b.fund_key || !FUND_KEYS.includes(b.fund_key)) return res.status(400).json({ message: 'Valid fund_key required' });
    if (!b.particulars) return res.status(400).json({ message: 'Particulars required' });
    const year = parseInt(b.fiscal_year) || new Date().getFullYear();
    const obligation = Number(b.obligation_amount || 0);
    const disbursement = Number(b.disbursement_amount || 0);

    // Validate against remaining appropriation balance for new obligations
    if (obligation > 0) {
      const [budgetRows] = await db.query('SELECT * FROM barangay_budget WHERE fiscal_year = ?', [year]);
      const appropriation = Number(budgetRows[0]?.[b.fund_key] || 0);
      const [totRows] = await db.query(
        `SELECT COALESCE(SUM(obligation_amount),0)::float AS o FROM rao_entries WHERE fiscal_year=? AND fund_key=?`,
        [year, b.fund_key]
      );
      const remaining = appropriation - Number(totRows[0].o);
      if (obligation > remaining) {
        return res.status(400).json({ message: `Insufficient appropriation balance. Available: ₱${remaining.toLocaleString('en-PH',{minimumFractionDigits:2})}` });
      }
    }

    const ref = await nextRef();
    const [r] = await db.query(
      `INSERT INTO rao_entries (ref_no, fiscal_year, fund_key, entry_date, particulars, account_code, payee,
        obligation_amount, disbursement_amount, source_module, source_ref_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [ref, year, b.fund_key, b.entry_date || new Date(), b.particulars, b.account_code || '', b.payee || '',
       obligation, disbursement, b.source_module || 'manual', b.source_ref_id || null]
    );
    res.status(201).json({ message: 'RAO entry posted', id: r.insertId, ref_no: ref });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const b = req.body;
    await db.query(
      `UPDATE rao_entries SET entry_date=?, particulars=?, account_code=?, payee=?, obligation_amount=?, disbursement_amount=? WHERE id=?`,
      [b.entry_date || null, b.particulars, b.account_code || '', b.payee || '', b.obligation_amount || 0, b.disbursement_amount || 0, req.params.id]
    );
    res.json({ message: 'Entry updated' });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try { await db.query('DELETE FROM rao_entries WHERE id=?', [req.params.id]); res.json({ message: 'Deleted' }); }
  catch (e) { next(e); }
}

// ── Programmatic helper for other Finance modules (procurement chain) ──
// Posts an obligation/disbursement automatically and rejects if it exceeds the fund balance.
async function postObligation({ fundKey, fiscalYear, amount, particulars, payee = '', accountCode = '', sourceModule, sourceRefId }) {
  const year = fiscalYear || new Date().getFullYear();
  const [budgetRows] = await db.query('SELECT * FROM barangay_budget WHERE fiscal_year = ?', [year]);
  const appropriation = Number(budgetRows[0]?.[fundKey] || 0);
  const [totRows] = await db.query(
    `SELECT COALESCE(SUM(obligation_amount),0)::float AS o FROM rao_entries WHERE fiscal_year=? AND fund_key=?`,
    [year, fundKey]
  );
  const remaining = appropriation - Number(totRows[0].o);
  if (Number(amount) > remaining) {
    throw new Error(`Insufficient appropriation balance in ${fundKey}. Available: ${remaining}`);
  }
  const ref = await nextRef();
  const [r] = await db.query(
    `INSERT INTO rao_entries (ref_no, fiscal_year, fund_key, entry_date, particulars, account_code, payee,
      obligation_amount, disbursement_amount, source_module, source_ref_id)
     VALUES (?,?,?,?,?,?,?,?,0,?,?)`,
    [ref, year, fundKey, new Date(), particulars, accountCode, payee, amount, sourceModule, sourceRefId]
  );
  return { id: r.insertId, ref_no: ref };
}

// Adds to the disbursement_amount of an existing obligation entry (e.g. when a DV is marked paid)
async function postDisbursement(raoEntryId, amount) {
  await db.query('UPDATE rao_entries SET disbursement_amount = disbursement_amount + ? WHERE id=?', [amount, raoEntryId]);
}

module.exports = { FUNDS, summary, list, create, update, remove, postObligation, postDisbursement };
