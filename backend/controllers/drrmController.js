const db = require('../config/db');

async function getAll(req, res, next) {
  try {
    const { status, alert_level } = req.query;
    let sql = `
      SELECT d.*, u.full_name AS reported_by_name
      FROM drrm_incidents d
      LEFT JOIN users u ON d.reported_by = u.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { sql += ' AND d.status = ?'; params.push(status); }
    if (alert_level) { sql += ' AND d.alert_level = ?'; params.push(alert_level); }
    sql += ' ORDER BY d.incident_date DESC, d.created_at DESC LIMIT 200';
    const [rows] = await db.query(sql, params);
    res.json({ incidents: rows });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { incident_title, incident_type, incident_date, location, alert_level,
      status, affected_families, affected_persons, description, response_actions } = req.body;
    if (!incident_title) return res.status(400).json({ message: 'Title required' });
    const [r] = await db.query(
      `INSERT INTO drrm_incidents
        (incident_title, incident_type, incident_date, location, alert_level, status,
         affected_families, affected_persons, description, response_actions, reported_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [incident_title, incident_type || null, incident_date || null, location || null,
       alert_level || 'green', status || 'active',
       affected_families || 0, affected_persons || 0,
       description || null, response_actions || null, req.user.id]
    );
    res.status(201).json({ message: 'Incident logged', id: r.insertId });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { incident_title, incident_type, incident_date, location, alert_level,
      status, affected_families, affected_persons, description, response_actions } = req.body;
    await db.query(
      `UPDATE drrm_incidents SET incident_title=?, incident_type=?, incident_date=?,
       location=?, alert_level=?, status=?, affected_families=?, affected_persons=?,
       description=?, response_actions=?, updated_at=NOW() WHERE id=?`,
      [incident_title, incident_type || null, incident_date || null, location || null,
       alert_level || 'green', status || 'active',
       affected_families || 0, affected_persons || 0,
       description || null, response_actions || null, id]
    );
    res.json({ message: 'Incident updated' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await db.query('DELETE FROM drrm_incidents WHERE id = ?', [req.params.id]);
    res.json({ message: 'Incident deleted' });
  } catch (err) { next(err); }
}

module.exports = { getAll, create, update, remove };