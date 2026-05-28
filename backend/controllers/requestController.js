const db = require('../config/db');
const QRCode = require('qrcode');
const auditService = require('../services/auditService');
const { generateControlNumber } = require('../utils/generateControlNumber');

async function getAllRequests(req, res, next) {
  try {
    const { status, type, resident_id } = req.query;

    let sql = `
      SELECT r.*,
        res.first_name || ' ' || res.last_name AS resident_name
      FROM requests r
      LEFT JOIN residents res ON r.resident_id = res.id
      WHERE 1=1
    `;
    const params = [];

    if (status) { params.push(status); sql += ` AND r.status = ?`; }
    if (type) { params.push(type); sql += ` AND r.request_type = ?`; }
    if (resident_id) { params.push(resident_id); sql += ` AND r.resident_id = ?`; }

    sql += ` ORDER BY r.created_at DESC LIMIT 200`;

    const [rows] = await db.query(sql, params);
    res.json({ requests: rows });
  } catch (err) {
    next(err);
  }
}

async function getRequest(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT r.*,
        res.first_name || ' ' || res.last_name AS resident_name,
        res.address
      FROM requests r
      LEFT JOIN residents res ON r.resident_id = res.id
      WHERE r.id = ?
    `, [id]);

    if (!rows[0]) return res.status(404).json({ message: 'Request not found' });
    res.json({ request: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function createRequest(req, res, next) {
  try {
    const { resident_id, request_type, purpose, remarks } = req.body;

    if (!resident_id || !request_type) {
      return res.status(400).json({ message: 'Resident and request type are required' });
    }

    const control_number = generateControlNumber(request_type);

    const [result] = await db.query(
      `INSERT INTO requests (resident_id, request_type, purpose, remarks, status, control_number, requested_by)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
      [resident_id, request_type, purpose || null, remarks || null, control_number, req.user.id]
    );

    await auditService.logAction(req.user.id, 'create_request', `Created ${request_type} request ${control_number}`);
    res.status(201).json({ message: 'Request created', request: { id: result.insertId, control_number } });
  } catch (err) {
    next(err);
  }
}

async function updateRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { request_type, purpose, remarks } = req.body;

    const [existing] = await db.query('SELECT id FROM requests WHERE id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'Request not found' });

    await db.query(
      `UPDATE requests SET
        request_type = COALESCE(?, request_type),
        purpose = COALESCE(?, purpose),
        remarks = COALESCE(?, remarks),
        updated_at = NOW()
       WHERE id = ?`,
      [request_type, purpose, remarks, id]
    );

    await auditService.logAction(req.user.id, 'update_request', `Updated request ${id}`);
    res.json({ message: 'Request updated' });
  } catch (err) {
    next(err);
  }
}

async function approveRequest(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await db.query('SELECT id, control_number FROM requests WHERE id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'Request not found' });

    await db.query(
      'UPDATE requests SET status = ?, approved_by = ?, approved_at = NOW(), updated_at = NOW() WHERE id = ?',
      ['approved', req.user.id, id]
    );

    await auditService.logAction(req.user.id, 'approve_request', `Approved request ${existing[0].control_number}`);
    res.json({ message: 'Request approved' });
  } catch (err) {
    next(err);
  }
}

async function rejectRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const [existing] = await db.query('SELECT id, control_number FROM requests WHERE id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'Request not found' });

    await db.query(
      'UPDATE requests SET status = ?, rejection_reason = ?, approved_by = ?, updated_at = NOW() WHERE id = ?',
      ['rejected', reason || null, req.user.id, id]
    );

    await auditService.logAction(req.user.id, 'reject_request', `Rejected request ${existing[0].control_number}`);
    res.json({ message: 'Request rejected' });
  } catch (err) {
    next(err);
  }
}

async function processRequest(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await db.query('SELECT id, control_number FROM requests WHERE id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'Request not found' });

    await db.query('UPDATE requests SET status = ?, updated_at = NOW() WHERE id = ?', ['processing', id]);
    await auditService.logAction(req.user.id, 'process_request', `Processing request ${existing[0].control_number}`);
    res.json({ message: 'Request is being processed' });
  } catch (err) {
    next(err);
  }
}

async function completeRequest(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await db.query('SELECT id, control_number FROM requests WHERE id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'Request not found' });

    await db.query(
      'UPDATE requests SET status = ?, completed_at = NOW(), updated_at = NOW() WHERE id = ?',
      ['completed', id]
    );

    await auditService.logAction(req.user.id, 'complete_request', `Completed request ${existing[0].control_number}`);
    res.json({ message: 'Request completed' });
  } catch (err) {
    next(err);
  }
}

async function deleteRequest(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await db.query('SELECT id FROM requests WHERE id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'Request not found' });

    await db.query('DELETE FROM requests WHERE id = ?', [id]);
    await auditService.logAction(req.user.id, 'delete_request', `Deleted request ${id}`);
    res.json({ message: 'Request deleted' });
  } catch (err) {
    next(err);
  }
}

async function exportPdf(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT r.*,
        res.first_name || ' ' || res.last_name AS resident_name,
        res.address
      FROM requests r
      LEFT JOIN residents res ON res.id = r.resident_id
      WHERE r.id = ?
    `, [id]);

    const request = rows[0];
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const html = `<!doctype html><html><head><meta charset="utf-8">
      <title>${request.request_type} Request</title>
      <style>body{font-family:Arial,sans-serif;padding:40px}h1{color:#1e40af}table{width:100%;border-collapse:collapse}td{padding:8px;border:1px solid #ddd}</style>
      </head><body>
      <h1>Barangay Request Certificate</h1>
      <p><strong>Control Number:</strong> ${request.control_number}</p>
      <table>
        <tr><td><strong>Name:</strong></td><td>${request.resident_name}</td></tr>
        <tr><td><strong>Address:</strong></td><td>${request.address || 'N/A'}</td></tr>
        <tr><td><strong>Request Type:</strong></td><td>${request.request_type}</td></tr>
        <tr><td><strong>Purpose:</strong></td><td>${request.purpose || 'N/A'}</td></tr>
        <tr><td><strong>Status:</strong></td><td>${request.status}</td></tr>
        <tr><td><strong>Date:</strong></td><td>${new Date(request.created_at).toLocaleDateString()}</td></tr>
      </table>
      </body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    next(err);
  }
}

async function getQrCode(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT control_number, status FROM requests WHERE id = ?', [id]);
    const request = rows[0];
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const qrPayload = { control_number: request.control_number, status: request.status };
    const qrImage = await QRCode.toDataURL(JSON.stringify(qrPayload));
    res.json({ qr: qrImage });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllRequests, getRequest, createRequest, updateRequest,
  approveRequest, rejectRequest, processRequest, completeRequest,
  deleteRequest, exportPdf, getQrCode
};