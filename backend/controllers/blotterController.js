const db = require('../config/db');
const auditService = require('../services/auditService');

// Generate case number
function generateCaseNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BLT-${year}${month}-${random}`;
}

// Get all blotter records
async function getRecords(req, res, next) {
  try {
    const { status, type } = req.query;
    
    let sql = `
      SELECT b.*, 
        CONCAT(c.first_name, ' ', c.last_name) AS complainant_name,
        CONCAT(r.first_name, ' ', r.last_name) AS respondent_name
      FROM blotter_records b
      LEFT JOIN residents c ON b.complainant_id = c.id
      LEFT JOIN residents r ON b.respondent_id = r.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      params.push(status);
      sql += ` AND b.status = ?`;
    }
    
    if (type) {
      params.push(type);
      sql += ` AND b.incident_type = ?`;
    }
    
    sql += ` ORDER BY b.incident_date DESC, b.created_at DESC LIMIT 200`;
    
    const [rows] = await db.query(sql, params);
    res.json({ records: rows });
  } catch (err) {
    next(err);
  }
}

// Get single blotter record
async function getRecord(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT b.*, 
        CONCAT(c.first_name, ' ', c.last_name) AS complainant_name,
        CONCAT(r.first_name, ' ', r.last_name) AS respondent_name
      FROM blotter_records b
      LEFT JOIN residents c ON b.complainant_id = c.id
      LEFT JOIN residents r ON b.respondent_id = r.id
      WHERE b.id = ?
    `, [id]);
    
    if (!rows[0]) {
      return res.status(404).json({ message: 'Record not found' });
    }
    
    res.json({ record: rows[0] });
  } catch (err) {
    next(err);
  }
}

// Create blotter record
async function createRecord(req, res, next) {
  try {
    const {
      complainant_id,
      respondent_id,
      incident_type,
      incident_date,
      incident_time,
      incident_location,
      narrative
    } = req.body;
    
    const case_number = generateCaseNumber();
    
    const [result] = await db.query(
      `INSERT INTO blotter_records 
        (case_number, complainant_id, respondent_id, incident_type, incident_date, incident_time, incident_location, narrative, status, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [case_number, complainant_id || null, respondent_id || null, incident_type, incident_date, incident_time || null, incident_location, narrative, req.user.id]
    );
    
    await auditService.logAction(req.user.id, 'create_blotter', `Created blotter record ${case_number}`);
    
    res.status(201).json({
      message: 'Blotter record created',
      record: {
        id: result.insertId,
        case_number
      }
    });
  } catch (err) {
    next(err);
  }
}

// Update blotter record
async function updateRecord(req, res, next) {
  try {
    const { id } = req.params;
    const {
      complainant_id,
      respondent_id,
      incident_type,
      incident_date,
      incident_time,
      incident_location,
      narrative,
      status,
      resolution,
      resolution_date
    } = req.body;
    
    const [existing] = await db.query('SELECT id FROM blotter_records WHERE id = ?', [id]);
    if (!existing[0]) {
      return res.status(404).json({ message: 'Record not found' });
    }
    
    await db.query(
      `UPDATE blotter_records SET
        complainant_id = COALESCE(?, complainant_id),
        respondent_id = COALESCE(?, respondent_id),
        incident_type = COALESCE(?, incident_type),
        incident_date = COALESCE(?, incident_date),
        incident_time = COALESCE(?, incident_time),
        incident_location = COALESCE(?, incident_location),
        narrative = COALESCE(?, narrative),
        status = COALESCE(?, status),
        resolution = COALESCE(?, resolution),
        resolution_date = COALESCE(?, resolution_date),
        updated_at = NOW()
       WHERE id = ?`,
      [complainant_id, respondent_id, incident_type, incident_date, incident_time, incident_location, narrative, status, resolution, resolution_date, id]
    );
    
    await auditService.logAction(req.user.id, 'update_blotter', `Updated blotter record ${id}`);
    
    res.json({ message: 'Blotter record updated' });
  } catch (err) {
    next(err);
  }
}

// Update status only
async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;
    
    const [existing] = await db.query('SELECT id FROM blotter_records WHERE id = ?', [id]);
    if (!existing[0]) {
      return res.status(404).json({ message: 'Record not found' });
    }
    
    let sql = 'UPDATE blotter_records SET status = ?, updated_at = NOW()';
    const params = [status];
    
    if (status === 'resolved' && resolution) {
      sql += ', resolution = ?, resolution_date = NOW()';
      params.push(resolution);
    }
    
    sql += ' WHERE id = ?';
    params.push(id);
    
    await db.query(sql, params);
    await auditService.logAction(req.user.id, 'update_blotter_status', `Updated blotter ${id} status to ${status}`);
    
    res.json({ message: 'Status updated' });
  } catch (err) {
    next(err);
  }
}

// Delete blotter record
async function deleteRecord(req, res, next) {
  try {
    const { id } = req.params;
    
    const [existing] = await db.query('SELECT id FROM blotter_records WHERE id = ?', [id]);
    if (!existing[0]) {
      return res.status(404).json({ message: 'Record not found' });
    }
    
    await db.query('DELETE FROM blotter_records WHERE id = ?', [id]);
    await auditService.logAction(req.user.id, 'delete_blotter', `Deleted blotter record ${id}`);
    
    res.json({ message: 'Blotter record deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRecords,
  getRecord,
  createRecord,
  updateRecord,
  updateStatus,
  deleteRecord
};
