const db = require('../config/db');

async function getAll(req, res, next) {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM barangay_projects WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json({ projects: rows });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { project_name, description, project_type, budget, contractor,
      start_date, end_date, status, progress_percentage, fund_source, location } = req.body;
    if (!project_name) return res.status(400).json({ message: 'Project name required' });
    const [r] = await db.query(
      `INSERT INTO barangay_projects
        (project_name, description, project_type, budget, contractor, start_date, end_date,
         status, progress_percentage, fund_source, location, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [project_name, description || null, project_type || null, budget || 0,
       contractor || null, start_date || null, end_date || null,
       status || 'planning', progress_percentage || 0, fund_source || null, location || null, req.user.id]
    );
    res.status(201).json({ message: 'Project created', id: r.insertId });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { project_name, description, project_type, budget, amount_spent, contractor,
      start_date, end_date, status, progress_percentage, fund_source, location } = req.body;

    // Auto-set completion_date when marking as completed
    let completionClause = '';
    const extraParams = [];
    if (status === 'completed') {
      // Check if already has a completion date
      const [existing] = await db.query('SELECT completion_date FROM barangay_projects WHERE id = ?', [id]);
      if (existing[0] && !existing[0].completion_date) {
        completionClause = ', completion_date = CURRENT_DATE';
      }
    } else if (status && status !== 'completed') {
      // Reset completion date if moved away from completed
      completionClause = ', completion_date = NULL';
    }

    const progressFinal = status === 'completed' ? 100 : (progress_percentage || 0);

    await db.query(
      `UPDATE barangay_projects SET project_name=?, description=?, project_type=?, budget=?,
       amount_spent=?, contractor=?, start_date=?, end_date=?, status=?,
       progress_percentage=?, fund_source=?, location=?, updated_at=NOW()${completionClause} WHERE id=?`,
      [project_name, description || null, project_type || null, budget || 0,
       amount_spent || 0, contractor || null, start_date || null, end_date || null,
       status || 'planning', progressFinal, fund_source || null, location || null, id]
    );
    res.json({ message: 'Project updated' });
  } catch (err) { next(err); }
}

// Quick status update — used by the inline card button
async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const VALID = ['planning', 'ongoing', 'completed', 'suspended'];
    if (!VALID.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const [existing] = await db.query(
      'SELECT status, completion_date, end_date FROM barangay_projects WHERE id = ?', [id]
    );
    if (!existing[0]) return res.status(404).json({ message: 'Project not found' });

    let completionClause = '';
    let progressClause   = '';

    if (status === 'completed') {
      // Set completion date to today (only if not already completed)
      if (!existing[0].completion_date) {
        completionClause = ', completion_date = CURRENT_DATE';
      }
      progressClause = ', progress_percentage = 100';
    } else {
      // Clear completion date if moving away from completed
      if (existing[0].status === 'completed') {
        completionClause = ', completion_date = NULL';
      }
    }

    await db.query(
      `UPDATE barangay_projects SET status = ?, updated_at = NOW()${completionClause}${progressClause} WHERE id = ?`,
      [status, id]
    );

    res.json({ message: `Status updated to ${status}` });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await db.query('DELETE FROM barangay_projects WHERE id = ?', [req.params.id]);
    res.json({ message: 'Project deleted' });
  } catch (err) { next(err); }
}

module.exports = { getAll, create, update, updateStatus, remove };