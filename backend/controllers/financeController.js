const pool = require('../config/db');

// Get all finances
exports.getFinances = async (req, res) => {
  try {
    const { transaction_type, category, page = 1, limit = 20, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    const connection = await pool.getConnection();

    let query = 'SELECT id, transaction_type, description, amount, category, payment_method, receipt_number, transaction_date, created_at FROM finances WHERE 1=1';
    const params = [];

    if (transaction_type) {
      query += ' AND transaction_type = ?';
      params.push(transaction_type);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (startDate) {
      query += ' AND DATE(transaction_date) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(transaction_date) <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY transaction_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [finances] = await connection.query(query, params);

    // Get totals
    let totalQuery = 'SELECT SUM(CASE WHEN transaction_type = "income" THEN amount ELSE 0 END) as total_income, SUM(CASE WHEN transaction_type = "expense" THEN amount ELSE 0 END) as total_expense FROM finances WHERE 1=1';
    const totalParams = [];

    if (transaction_type) {
      totalQuery += ' AND transaction_type = ?';
      totalParams.push(transaction_type);
    }
    if (category) {
      totalQuery += ' AND category = ?';
      totalParams.push(category);
    }
    if (startDate) {
      totalQuery += ' AND DATE(transaction_date) >= ?';
      totalParams.push(startDate);
    }
    if (endDate) {
      totalQuery += ' AND DATE(transaction_date) <= ?';
      totalParams.push(endDate);
    }

    const [totals] = await connection.query(totalQuery, totalParams);
    connection.release();

    const balance = (totals[0].total_income || 0) - (totals[0].total_expense || 0);

    res.json({
      success: true,
      finances,
      summary: {
        total_income: totals[0].total_income || 0,
        total_expense: totals[0].total_expense || 0,
        balance
      }
    });
  } catch (error) {
    console.error('Get finances error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch finances'
    });
  }
};

// Create finance record
exports.createFinance = async (req, res) => {
  try {
    const { transaction_type, description, amount, category, payment_method, receipt_number, transaction_date, notes } = req.body;

    if (!transaction_type || !description || !amount || !transaction_date) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing'
      });
    }

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO finances (transaction_type, description, amount, category, payment_method, receipt_number, transaction_date, notes, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [transaction_type, description, amount, category, payment_method, receipt_number, transaction_date, notes, req.user.id]
    );
    connection.release();

    res.status(201).json({
      success: true,
      message: 'Finance record created successfully',
      record: {
        id: result.insertId,
        transaction_type,
        description,
        amount,
        category,
        transaction_date
      }
    });
  } catch (error) {
    console.error('Create finance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create finance record'
    });
  }
};

// Update finance
exports.updateFinance = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, category, payment_method, notes } = req.body;

    const updateFields = [];
    const updateValues = [];

    if (description) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (amount) {
      updateFields.push('amount = ?');
      updateValues.push(amount);
    }
    if (category) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }
    if (payment_method) {
      updateFields.push('payment_method = ?');
      updateValues.push(payment_method);
    }
    if (notes) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateValues.push(id);

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      `UPDATE finances SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      updateValues
    );
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    res.json({
      success: true,
      message: 'Finance record updated successfully'
    });
  } catch (error) {
    console.error('Update finance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update finance record'
    });
  }
};

// Delete finance
exports.deleteFinance = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'DELETE FROM finances WHERE id = ?',
      [id]
    );
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    res.json({
      success: true,
      message: 'Finance record deleted successfully'
    });
  } catch (error) {
    console.error('Delete finance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete finance record'
    });
  }
};

// Get finance statistics
exports.getFinanceStats = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [stats] = await connection.query(`
      SELECT
        SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expense,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as transactions_today
      FROM finances
    `);

    connection.release();

    const balance = (stats[0].total_income || 0) - (stats[0].total_expense || 0);

    res.json({
      success: true,
      stats: {
        total_income: stats[0].total_income || 0,
        total_expense: stats[0].total_expense || 0,
        balance,
        total_transactions: stats[0].total_transactions || 0,
        transactions_today: stats[0].transactions_today || 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
};

// Export finance to CSV
exports.exportFinances = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [finances] = await connection.query(
      'SELECT id, transaction_type, description, amount, category, payment_method, receipt_number, transaction_date, created_at FROM finances ORDER BY transaction_date DESC'
    );
    connection.release();

    const csv = [
      ['ID', 'Type', 'Description', 'Amount', 'Category', 'Payment Method', 'Receipt #', 'Date', 'Created At'].join(',')
    ];

    finances.forEach(f => {
      csv.push([
        f.id,
        f.transaction_type,
        `"${f.description}"`,
        f.amount,
        f.category || '',
        f.payment_method || '',
        f.receipt_number || '',
        f.transaction_date,
        f.created_at
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=finances.csv');
    res.send(csv.join('\n'));
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export finances'
    });
  }
};
