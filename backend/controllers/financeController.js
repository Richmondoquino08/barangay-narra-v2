const pool = require('../config/db');

exports.getFinances = async (req, res) => {
  try {
    const { transaction_type, category, page = 1, limit = 20, startDate, endDate } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `SELECT id, transaction_type, description, amount, category, payment_method,
      receipt_number, transaction_date, created_at FROM finances WHERE 1=1`;
    const params = [];

    if (transaction_type) { params.push(transaction_type); query += ' AND transaction_type = ?'; }
    if (category) { params.push(category); query += ' AND category = ?'; }
    if (startDate) { params.push(startDate); query += ' AND transaction_date >= ?'; }
    if (endDate) { params.push(endDate); query += ' AND transaction_date <= ?'; }

    query += ' ORDER BY transaction_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [finances] = await pool.query(query, params);

    const totalParams = [];
    let totalQuery = `SELECT
      SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expense
      FROM finances WHERE 1=1`;

    if (transaction_type) { totalParams.push(transaction_type); totalQuery += ' AND transaction_type = ?'; }
    if (category) { totalParams.push(category); totalQuery += ' AND category = ?'; }
    if (startDate) { totalParams.push(startDate); totalQuery += ' AND transaction_date >= ?'; }
    if (endDate) { totalParams.push(endDate); totalQuery += ' AND transaction_date <= ?'; }

    const [totals] = await pool.query(totalQuery, totalParams);
    const balance = (parseFloat(totals[0]?.total_income) || 0) - (parseFloat(totals[0]?.total_expense) || 0);

    res.json({
      success: true,
      finances,
      summary: {
        total_income: parseFloat(totals[0]?.total_income) || 0,
        total_expense: parseFloat(totals[0]?.total_expense) || 0,
        balance
      }
    });
  } catch (error) {
    console.error('Get finances error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch finances' });
  }
};

exports.createFinance = async (req, res) => {
  try {
    const { transaction_type, description, amount, category, payment_method, receipt_number, transaction_date, notes } = req.body;

    if (!transaction_type || !description || !amount || !transaction_date) {
      return res.status(400).json({ success: false, message: 'Required fields are missing' });
    }

    const [result] = await pool.query(
      'INSERT INTO finances (transaction_type, description, amount, category, payment_method, receipt_number, transaction_date, notes, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [transaction_type, description, amount, category || null, payment_method || null,
       receipt_number || null, transaction_date, notes || null, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Finance record created successfully',
      record: { id: result.insertId, transaction_type, description, amount, category, transaction_date }
    });
  } catch (error) {
    console.error('Create finance error:', error);
    res.status(500).json({ success: false, message: 'Failed to create finance record' });
  }
};

exports.updateFinance = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, category, payment_method, notes } = req.body;

    const updateFields = [];
    const updateValues = [];

    if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description); }
    if (amount !== undefined) { updateFields.push('amount = ?'); updateValues.push(amount); }
    if (category !== undefined) { updateFields.push('category = ?'); updateValues.push(category); }
    if (payment_method !== undefined) { updateFields.push('payment_method = ?'); updateValues.push(payment_method); }
    if (notes !== undefined) { updateFields.push('notes = ?'); updateValues.push(notes); }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    updateValues.push(id);
    const [result] = await pool.query(
      `UPDATE finances SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({ success: true, message: 'Finance record updated successfully' });
  } catch (error) {
    console.error('Update finance error:', error);
    res.status(500).json({ success: false, message: 'Failed to update finance record' });
  }
};

exports.deleteFinance = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM finances WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({ success: true, message: 'Finance record deleted successfully' });
  } catch (error) {
    console.error('Delete finance error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete finance record' });
  }
};

exports.getFinanceStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT
        SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expense,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 ELSE 0 END) as transactions_today
      FROM finances
    `);

    const balance = (parseFloat(stats[0]?.total_income) || 0) - (parseFloat(stats[0]?.total_expense) || 0);

    res.json({
      success: true,
      stats: {
        total_income: parseFloat(stats[0]?.total_income) || 0,
        total_expense: parseFloat(stats[0]?.total_expense) || 0,
        balance,
        total_transactions: parseInt(stats[0]?.total_transactions) || 0,
        transactions_today: parseInt(stats[0]?.transactions_today) || 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
};

exports.exportFinances = async (req, res) => {
  try {
    const [finances] = await pool.query(
      'SELECT id, transaction_type, description, amount, category, payment_method, receipt_number, transaction_date, created_at FROM finances ORDER BY transaction_date DESC'
    );

    const csv = [
      ['ID', 'Type', 'Description', 'Amount', 'Category', 'Payment Method', 'Receipt #', 'Date', 'Created At'].join(',')
    ];

    finances.forEach(f => {
      csv.push([
        f.id, f.transaction_type, `"${f.description}"`, f.amount,
        f.category || '', f.payment_method || '', f.receipt_number || '',
        f.transaction_date, f.created_at
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=finances.csv');
    res.send(csv.join('\n'));
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export finances' });
  }
};