const db = require('../config/db');

// ── Budget declarations ────────────────────────────────────────────────────
async function getBudget(req, res, next) {
  try {
    const year = req.query.year || new Date().getFullYear();
    const [rows] = await db.query(
      'SELECT * FROM barangay_budget WHERE fiscal_year = ?', [year]
    );
    res.json({ budget: rows[0] || null });
  } catch (err) { next(err); }
}

async function getAllBudgets(req, res, next) {
  try {
    const [rows] = await db.query('SELECT * FROM barangay_budget ORDER BY fiscal_year DESC');
    res.json({ budgets: rows });
  } catch (err) { next(err); }
}

async function saveBudget(req, res, next) {
  try {
    const {
      fiscal_year, total_budget, ira_share, estimated_local_revenue,
      general_fund, dev_fund_20pct, drrm_fund_5pct, special_fund,
      sk_fund, gad_fund, lcpc_fund, ps_budget, debt_service, notes
    } = req.body;
    if (!fiscal_year || !total_budget) return res.status(400).json({ message: 'Fiscal year and total budget required' });

    const vals = [
      total_budget, ira_share || 0, estimated_local_revenue || 0,
      general_fund || 0, dev_fund_20pct || 0, drrm_fund_5pct || 0, special_fund || 0,
      sk_fund || 0, gad_fund || 0, lcpc_fund || 0, ps_budget || 0, debt_service || 0, notes || null
    ];

    const [existing] = await db.query('SELECT id FROM barangay_budget WHERE fiscal_year = ?', [fiscal_year]);
    if (existing.length) {
      await db.query(
        `UPDATE barangay_budget SET total_budget=?, ira_share=?, estimated_local_revenue=?,
         general_fund=?, dev_fund_20pct=?, drrm_fund_5pct=?, special_fund=?,
         sk_fund=?, gad_fund=?, lcpc_fund=?, ps_budget=?, debt_service=?,
         notes=?, updated_at=NOW() WHERE fiscal_year=?`,
        [...vals, fiscal_year]
      );
      res.json({ message: 'Budget updated' });
    } else {
      await db.query(
        `INSERT INTO barangay_budget
           (fiscal_year, total_budget, ira_share, estimated_local_revenue,
            general_fund, dev_fund_20pct, drrm_fund_5pct, special_fund,
            sk_fund, gad_fund, lcpc_fund, ps_budget, debt_service, notes, declared_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [fiscal_year, ...vals, req.user.id]
      );
      res.status(201).json({ message: 'Budget declared' });
    }
  } catch (err) { next(err); }
}

// ── Budget utilization summary ─────────────────────────────────────────────
async function getBudgetSummary(req, res, next) {
  try {
    const year = req.query.year || new Date().getFullYear();

    // Declared budget
    const [budgetRows] = await db.query('SELECT * FROM barangay_budget WHERE fiscal_year = ?', [year]);
    const budget = budgetRows[0] || null;

    // Finance totals grouped by category
    const [financeGroups] = await db.query(`
      SELECT
        budget_category,
        transaction_type,
        SUM(amount) AS total,
        COUNT(*) AS count
      FROM finances
      WHERE EXTRACT(YEAR FROM transaction_date) = ?
      GROUP BY budget_category, transaction_type
      ORDER BY transaction_type, total DESC
    `, [year]);

    // Salary totals grouped by fund_source
    const [salaryGroups] = await db.query(`
      SELECT fund_source, SUM(amount) AS total, COUNT(*) AS count
      FROM salary_records
      WHERE EXTRACT(YEAR FROM paid_date) = ? OR paid_date IS NULL
      GROUP BY fund_source
    `, [year]);

    // Project budgets by fund source
    const [projectGroups] = await db.query(`
      SELECT fund_source, SUM(budget) AS budget_total, SUM(amount_spent) AS spent_total, COUNT(*) AS count
      FROM barangay_projects
      WHERE EXTRACT(YEAR FROM COALESCE(start_date, created_at)) = ?
      GROUP BY fund_source
    `, [year]);

    // Category-level income breakdown
    const [incomeByCategory] = await db.query(`
      SELECT COALESCE(budget_category, category, 'Uncategorized') AS cat,
             SUM(amount) AS total, COUNT(*) AS count
      FROM finances
      WHERE transaction_type = 'income'
        AND EXTRACT(YEAR FROM transaction_date) = ?
      GROUP BY cat ORDER BY total DESC
    `, [year]);

    // Category-level expense breakdown
    const [expenseByCategory] = await db.query(`
      SELECT COALESCE(budget_category, category, 'Uncategorized') AS cat,
             SUM(amount) AS total, COUNT(*) AS count
      FROM finances
      WHERE transaction_type = 'expense'
        AND EXTRACT(YEAR FROM transaction_date) = ?
      GROUP BY cat ORDER BY total DESC
    `, [year]);

    const totalIncome   = financeGroups.filter(r => r.transaction_type === 'income').reduce((s,r) => s + Number(r.total), 0);
    const totalExpenses = financeGroups.filter(r => r.transaction_type === 'expense').reduce((s,r) => s + Number(r.total), 0);
    const totalSalary   = salaryGroups.reduce((s,r) => s + Number(r.total), 0);

    res.json({
      year: parseInt(year),
      budget,
      totalIncome,
      totalExpenses,
      totalSalary,
      netBalance: totalIncome - totalExpenses - totalSalary,
      incomeByCategory,
      expenseByCategory,
      salaryGroups,
      projectGroups,
    });
  } catch (err) { next(err); }
}

// ── Salary records ─────────────────────────────────────────────────────────
async function getSalaries(req, res, next) {
  try {
    const { year, month } = req.query;
    let sql = 'SELECT * FROM salary_records WHERE 1=1';
    const params = [];
    if (year)  { sql += ' AND EXTRACT(YEAR FROM paid_date) = ?';  params.push(year); }
    if (month) { sql += ' AND EXTRACT(MONTH FROM paid_date) = ?'; params.push(month); }
    sql += ' ORDER BY paid_date DESC, created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json({ records: rows });
  } catch (err) { next(err); }
}

async function createSalary(req, res, next) {
  try {
    const { employee_name, position, payment_type, amount, period_label, paid_date, or_number, fund_source, notes } = req.body;
    if (!employee_name || !amount) return res.status(400).json({ message: 'Employee name and amount required' });
    const [r] = await db.query(
      `INSERT INTO salary_records (employee_name, position, payment_type, amount, period_label, paid_date, or_number, fund_source, notes, recorded_by)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [employee_name, position||null, payment_type||'Monthly Salary', amount, period_label||null,
       paid_date||null, or_number||null, fund_source||'General Fund', notes||null, req.user.id]
    );

    // Auto-create a corresponding finance expense entry
    await db.query(
      `INSERT INTO finances (transaction_type, description, amount, category, payment_method, receipt_number,
       transaction_date, budget_category, source_type, source_ref_id, recorded_by)
       VALUES ('expense', ?, ?, 'Salaries', 'Cash', ?, ?, ?, 'salary', ?, ?)`,
      [
        `${payment_type||'Salary'} — ${employee_name}${period_label ? ' (' + period_label + ')' : ''}`,
        amount, or_number||null, paid_date || new Date().toISOString().split('T')[0],
        fund_source||'General Fund', r.insertId, req.user.id
      ]
    );

    res.status(201).json({ message: 'Salary recorded', id: r.insertId });
  } catch (err) { next(err); }
}

async function updateSalary(req, res, next) {
  try {
    const { id } = req.params;
    const { employee_name, position, payment_type, amount, period_label, paid_date, or_number, fund_source, notes } = req.body;
    await db.query(
      `UPDATE salary_records SET employee_name=?, position=?, payment_type=?, amount=?,
       period_label=?, paid_date=?, or_number=?, fund_source=?, notes=? WHERE id=?`,
      [employee_name, position||null, payment_type||'Monthly Salary', amount,
       period_label||null, paid_date||null, or_number||null, fund_source||'General Fund', notes||null, id]
    );
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
}

async function deleteSalary(req, res, next) {
  try {
    await db.query('DELETE FROM salary_records WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
}

// ── Budget check (used before creating project) ────────────────────────────
async function checkBudget(req, res, next) {
  try {
    const { fund_source, amount, year } = req.query;
    const fiscalYear = year || new Date().getFullYear();

    const [budgetRows] = await db.query('SELECT * FROM barangay_budget WHERE fiscal_year = ?', [fiscalYear]);
    if (!budgetRows[0]) return res.json({ ok: true, message: 'No budget declared — no restriction', hasBudget: false });

    const budget = budgetRows[0];
    const fundMap = {
      'General Fund':          budget.general_fund,
      '20% Development Fund':  budget.dev_fund_20pct,
      'DRRM Fund':             budget.drrm_fund_5pct,
      'Special Fund':          budget.special_fund,
    };

    const allocated = Number(fundMap[fund_source] || budget.total_budget || 0);
    if (!allocated) return res.json({ ok: true, message: 'No allocation for this fund source', hasBudget: true });

    // Sum existing project budgets for same fund source
    const [projectSum] = await db.query(
      `SELECT COALESCE(SUM(budget),0) AS used FROM barangay_projects WHERE fund_source = ? AND status != 'suspended'`,
      [fund_source]
    );
    // Sum existing finance expenses for this category
    const [finSum] = await db.query(
      `SELECT COALESCE(SUM(amount),0) AS used FROM finances WHERE transaction_type='expense' AND budget_category=? AND EXTRACT(YEAR FROM transaction_date)=?`,
      [fund_source, fiscalYear]
    );
    // Salary
    const [salSum] = await db.query(
      `SELECT COALESCE(SUM(amount),0) AS used FROM salary_records WHERE fund_source=? AND EXTRACT(YEAR FROM paid_date)=?`,
      [fund_source, fiscalYear]
    );

    const used      = Number(projectSum[0]?.used || 0) + Number(finSum[0]?.used || 0) + Number(salSum[0]?.used || 0);
    const requested = Number(amount || 0);
    const remaining = allocated - used;
    const ok        = remaining >= requested;

    res.json({ ok, hasBudget: true, allocated, used, remaining, requested,
      message: ok ? `Sufficient — ₱${remaining.toLocaleString('en-PH',{minimumFractionDigits:2})} remaining` : `Insufficient — only ₱${remaining.toLocaleString('en-PH',{minimumFractionDigits:2})} remaining out of ₱${allocated.toLocaleString('en-PH',{minimumFractionDigits:2})} allocated`
    });
  } catch (err) { next(err); }
}

module.exports = { getBudget, getAllBudgets, saveBudget, getBudgetSummary, getSalaries, createSalary, updateSalary, deleteSalary, checkBudget };