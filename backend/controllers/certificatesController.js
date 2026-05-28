const pool = require('../config/db');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

exports.uploadTemplate = async (req, res) => {
  try {
    const { template_name, certificate_type } = req.body;
    const file = req.file;

    if (!template_name || !certificate_type || !file) {
      return res.status(400).json({ success: false, message: 'Template name, certificate type, and file are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO certificate_templates (template_name, certificate_type, file_path, file_type, uploaded_by, is_active) VALUES (?, ?, ?, ?, ?, true)',
      [template_name, certificate_type, file.path, file.mimetype, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Template uploaded successfully',
      template: { id: result.insertId, template_name, certificate_type, file_path: file.path }
    });
  } catch (error) {
    console.error('Upload template error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload template' });
  }
};

exports.getTemplates = async (req, res) => {
  try {
    const { certificate_type } = req.query;
    let query = 'SELECT id, template_name, certificate_type, file_path, file_type, uploaded_by, is_active, created_at FROM certificate_templates WHERE is_active = true';
    const params = [];

    if (certificate_type) { query += ' AND certificate_type = ?'; params.push(certificate_type); }
    query += ' ORDER BY created_at DESC';

    const [templates] = await pool.query(query, params);
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch templates' });
  }
};

exports.getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const [templates] = await pool.query('SELECT * FROM certificate_templates WHERE id = ? AND is_active = true', [id]);

    if (templates.length === 0) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({ success: true, template: templates[0] });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch template' });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const [template] = await pool.query('SELECT file_path FROM certificate_templates WHERE id = ?', [id]);

    if (template.length === 0) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    try { if (fs.existsSync(template[0].file_path)) fs.unlinkSync(template[0].file_path); } catch (_) {}

    await pool.query('UPDATE certificate_templates SET is_active = false WHERE id = ?', [id]);
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete template' });
  }
};

exports.generateCertificate = async (req, res) => {
  try {
    const { resident_id, certificate_type, template_id, purpose } = req.body;

    if (!resident_id || !certificate_type) {
      return res.status(400).json({ success: false, message: 'Resident ID and certificate type are required' });
    }

    const [residents] = await pool.query(
      'SELECT first_name, middle_name, last_name, address, birth_date, gender FROM residents WHERE id = ?',
      [resident_id]
    );

    if (residents.length === 0) {
      return res.status(404).json({ success: false, message: 'Resident not found' });
    }

    const resident = residents[0];
    const fullName = `${resident.first_name}${resident.middle_name ? ' ' + resident.middle_name : ''} ${resident.last_name}`;

    const qrData = `CERT-${Date.now()}-${resident_id}`;
    const certDir = path.join(__dirname, '../uploads/certificates');
    if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });
    const qrCodePath = path.join(certDir, `qr-${qrData}.png`);
    await QRCode.toFile(qrCodePath, qrData);

    const issue_date = new Date().toISOString().split('T')[0];
    const [result] = await pool.query(
      `INSERT INTO certificates (resident_id, certificate_type, template_id, purpose, issue_date, status, qr_code_data, created_by)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [resident_id, certificate_type, template_id || null, purpose || null, issue_date, qrData, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Certificate generated successfully',
      certificate: {
        id: result.insertId, resident_id, resident_name: fullName,
        certificate_type, purpose, issue_date, status: 'pending', qr_code: qrData
      }
    });
  } catch (error) {
    console.error('Generate certificate error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate certificate' });
  }
};

exports.getCertificates = async (req, res) => {
  try {
    const { resident_id, certificate_type, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `SELECT c.id, c.resident_id, c.certificate_type, c.purpose, c.issue_date, c.status, c.created_at,
                 r.first_name, r.middle_name, r.last_name
                 FROM certificates c JOIN residents r ON c.resident_id = r.id WHERE 1=1`;
    const params = [];

    if (resident_id) { params.push(resident_id); query += ' AND c.resident_id = ?'; }
    if (certificate_type) { params.push(certificate_type); query += ' AND c.certificate_type = ?'; }
    if (status) { params.push(status); query += ' AND c.status = ?'; }

    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [certificates] = await pool.query(query, params);
    const certsList = certificates.map(c => ({
      ...c,
      resident_name: `${c.first_name}${c.middle_name ? ' ' + c.middle_name : ''} ${c.last_name}`
    }));

    res.json({ success: true, certificates: certsList });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch certificates' });
  }
};

exports.getCertificateById = async (req, res) => {
  try {
    const { id } = req.params;
    const [certificates] = await pool.query(
      `SELECT c.*, r.first_name, r.middle_name, r.last_name, r.address, r.birth_date
       FROM certificates c JOIN residents r ON c.resident_id = r.id WHERE c.id = ?`,
      [id]
    );

    if (certificates.length === 0) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    res.json({ success: true, certificate: certificates[0] });
  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch certificate' });
  }
};

exports.approveCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      `UPDATE certificates SET status = 'approved', approved_by = ?, updated_at = NOW() WHERE id = ?`,
      [req.user.id, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    res.json({ success: true, message: 'Certificate approved successfully' });
  } catch (error) {
    console.error('Approve certificate error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve certificate' });
  }
};

exports.rejectCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      `UPDATE certificates SET status = 'rejected', approved_by = ?, updated_at = NOW() WHERE id = ?`,
      [req.user.id, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    res.json({ success: true, message: 'Certificate rejected' });
  } catch (error) {
    console.error('Reject certificate error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject certificate' });
  }
};

exports.deleteCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM certificates WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    res.json({ success: true, message: 'Certificate deleted successfully' });
  } catch (error) {
    console.error('Delete certificate error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete certificate' });
  }
};

exports.getCertificateStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 ELSE 0 END) as issued_today
      FROM certificates
    `);

    res.json({ success: true, stats: stats[0] });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
};