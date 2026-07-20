const db = require('../config/db');

// ── 4Ps ──────────────────────────────────────────────────────────────────
async function get4Ps(req, res, next) {
  try {
    const [rows] = await db.query(`
      SELECT f.*, r.first_name, r.last_name, r.purok,
             CONCAT(r.first_name, ' ', r.last_name) AS resident_name
      FROM four_ps_beneficiaries f
      JOIN residents r ON f.resident_id = r.id
      ORDER BY r.last_name, r.first_name
    `);
    res.json({ beneficiaries: rows });
  } catch (err) { next(err); }
}

async function create4Ps(req, res, next) {
  try {
    const { resident_id, beneficiary_number, date_registered, compliance_status,
      last_benefit_date, dswd_referral, notes } = req.body;
    if (!resident_id) return res.status(400).json({ message: 'Resident required' });
    const [r] = await db.query(
      `INSERT INTO four_ps_beneficiaries
        (resident_id, beneficiary_number, date_registered, compliance_status, last_benefit_date, dswd_referral, notes)
       VALUES (?,?,?,?,?,?,?)`,
      [resident_id, beneficiary_number || null, date_registered || null,
       compliance_status || 'compliant', last_benefit_date || null, dswd_referral || false, notes || null]
    );
    res.status(201).json({ message: '4Ps beneficiary added', id: r.insertId });
  } catch (err) { next(err); }
}

async function update4Ps(req, res, next) {
  try {
    const { id } = req.params;
    const { beneficiary_number, date_registered, compliance_status,
      last_benefit_date, dswd_referral, dswd_referral_date, notes, is_active } = req.body;
    await db.query(
      `UPDATE four_ps_beneficiaries SET beneficiary_number=?, date_registered=?, compliance_status=?,
       last_benefit_date=?, dswd_referral=?, dswd_referral_date=?, notes=?, is_active=?, updated_at=NOW()
       WHERE id=?`,
      [beneficiary_number || null, date_registered || null, compliance_status || 'compliant',
       last_benefit_date || null, dswd_referral || false, dswd_referral_date || null,
       notes || null, is_active !== false, id]
    );
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
}

async function delete4Ps(req, res, next) {
  try {
    await db.query('DELETE FROM four_ps_beneficiaries WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
}

// ── PWD ──────────────────────────────────────────────────────────────────
async function getPwd(req, res, next) {
  try {
    const [rows] = await db.query(`
      SELECT p.*, r.first_name, r.last_name, r.purok, r.birth_date,
             CONCAT(r.first_name, ' ', r.last_name) AS resident_name
      FROM pwd_registry p
      JOIN residents r ON p.resident_id = r.id
      ORDER BY r.last_name, r.first_name
    `);
    res.json({ records: rows });
  } catch (err) { next(err); }
}

async function createPwd(req, res, next) {
  try {
    const { resident_id, disability_type, pwd_id_number, pwd_id_status,
      date_registered, id_expiry_date, notes } = req.body;
    if (!resident_id) return res.status(400).json({ message: 'Resident required' });
    const [r] = await db.query(
      `INSERT INTO pwd_registry
        (resident_id, disability_type, pwd_id_number, pwd_id_status, date_registered, id_expiry_date, notes)
       VALUES (?,?,?,?,?,?,?)`,
      [resident_id, disability_type || null, pwd_id_number || null,
       pwd_id_status || 'active', date_registered || null, id_expiry_date || null, notes || null]
    );
    res.status(201).json({ message: 'PWD registered', id: r.insertId });
  } catch (err) { next(err); }
}

async function updatePwd(req, res, next) {
  try {
    const { id } = req.params;
    const { disability_type, pwd_id_number, pwd_id_status, date_registered, id_expiry_date, notes, is_active } = req.body;
    await db.query(
      `UPDATE pwd_registry SET disability_type=?, pwd_id_number=?, pwd_id_status=?,
       date_registered=?, id_expiry_date=?, notes=?, is_active=?, updated_at=NOW() WHERE id=?`,
      [disability_type || null, pwd_id_number || null, pwd_id_status || 'active',
       date_registered || null, id_expiry_date || null, notes || null, is_active !== false, id]
    );
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
}

async function deletePwd(req, res, next) {
  try {
    await db.query('DELETE FROM pwd_registry WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
}

// ── OSCA / Senior Citizens ────────────────────────────────────────────────
async function getOsca(req, res, next) {
  try {
    const [rows] = await db.query(`
      SELECT o.*, r.first_name, r.last_name, r.purok, r.birth_date,
             CONCAT(r.first_name, ' ', r.last_name) AS resident_name,
             DATE_PART('year', AGE(r.birth_date::date)) AS age
      FROM osca_registry o
      JOIN residents r ON o.resident_id = r.id
      ORDER BY r.last_name, r.first_name
    `);
    res.json({ records: rows });
  } catch (err) { next(err); }
}

async function createOsca(req, res, next) {
  try {
    const { resident_id, osca_number, date_registered, monthly_stipend, last_stipend_date, notes } = req.body;
    if (!resident_id) return res.status(400).json({ message: 'Resident required' });
    const [r] = await db.query(
      `INSERT INTO osca_registry (resident_id, osca_number, date_registered, monthly_stipend, last_stipend_date, notes)
       VALUES (?,?,?,?,?,?)`,
      [resident_id, osca_number || null, date_registered || null,
       monthly_stipend || 0, last_stipend_date || null, notes || null]
    );
    res.status(201).json({ message: 'Senior citizen registered', id: r.insertId });
  } catch (err) { next(err); }
}

async function updateOsca(req, res, next) {
  try {
    const { id } = req.params;
    const { osca_number, date_registered, monthly_stipend, last_stipend_date, discount_card_status, notes, is_active } = req.body;
    await db.query(
      `UPDATE osca_registry SET osca_number=?, date_registered=?, monthly_stipend=?,
       last_stipend_date=?, discount_card_status=?, notes=?, is_active=?, updated_at=NOW() WHERE id=?`,
      [osca_number || null, date_registered || null, monthly_stipend || 0,
       last_stipend_date || null, discount_card_status || 'active', notes || null, is_active !== false, id]
    );
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
}

async function deleteOsca(req, res, next) {
  try {
    await db.query('DELETE FROM osca_registry WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
}

// ── BHW ──────────────────────────────────────────────────────────────────
async function getBhw(req, res, next) {
  try {
    const [rows] = await db.query('SELECT * FROM bhw_roster ORDER BY full_name');
    res.json({ bhws: rows });
  } catch (err) { next(err); }
}

async function createBhw(req, res, next) {
  try {
    const { full_name, purok, contact_number, date_assigned, training_date, area_covered, specialization } = req.body;
    if (!full_name) return res.status(400).json({ message: 'Name required' });
    const [r] = await db.query(
      `INSERT INTO bhw_roster (full_name, purok, contact_number, date_assigned, training_date, area_covered, specialization)
       VALUES (?,?,?,?,?,?,?)`,
      [full_name, purok || null, contact_number || null, date_assigned || null,
       training_date || null, area_covered || null, specialization || null]
    );
    res.status(201).json({ message: 'BHW added', id: r.insertId });
  } catch (err) { next(err); }
}

async function updateBhw(req, res, next) {
  try {
    const { id } = req.params;
    const { full_name, purok, contact_number, date_assigned, training_date, status, area_covered, specialization } = req.body;
    await db.query(
      `UPDATE bhw_roster SET full_name=?, purok=?, contact_number=?, date_assigned=?,
       training_date=?, status=?, area_covered=?, specialization=?, updated_at=NOW() WHERE id=?`,
      [full_name, purok || null, contact_number || null, date_assigned || null,
       training_date || null, status || 'active', area_covered || null, specialization || null, id]
    );
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
}

async function deleteBhw(req, res, next) {
  try {
    await db.query('DELETE FROM bhw_roster WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
}

// ── SK Officials ──────────────────────────────────────────────────────────
async function getSk(req, res, next) {
  try {
    const [rows] = await db.query('SELECT * FROM sk_officials ORDER BY position, full_name');
    res.json({ officials: rows });
  } catch (err) { next(err); }
}

async function createSk(req, res, next) {
  try {
    const { full_name, position, age, contact_number, term_start, term_end, is_oesy } = req.body;
    if (!full_name) return res.status(400).json({ message: 'Name required' });
    const [r] = await db.query(
      `INSERT INTO sk_officials (full_name, position, age, contact_number, term_start, term_end, is_oesy)
       VALUES (?,?,?,?,?,?,?)`,
      [full_name, position || null, age || null, contact_number || null,
       term_start || null, term_end || null, is_oesy || false]
    );
    res.status(201).json({ message: 'SK official added', id: r.insertId });
  } catch (err) { next(err); }
}

async function updateSk(req, res, next) {
  try {
    const { id } = req.params;
    const { full_name, position, age, contact_number, term_start, term_end, is_oesy, is_active } = req.body;
    await db.query(
      `UPDATE sk_officials SET full_name=?, position=?, age=?, contact_number=?,
       term_start=?, term_end=?, is_oesy=?, is_active=?, updated_at=NOW() WHERE id=?`,
      [full_name, position || null, age || null, contact_number || null,
       term_start || null, term_end || null, is_oesy || false, is_active !== false, id]
    );
    res.json({ message: 'Updated' });
  } catch (err) { next(err); }
}

async function deleteSk(req, res, next) {
  try {
    await db.query('DELETE FROM sk_officials WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
}

module.exports = {
  get4Ps, create4Ps, update4Ps, delete4Ps,
  getPwd, createPwd, updatePwd, deletePwd,
  getOsca, createOsca, updateOsca, deleteOsca,
  getBhw, createBhw, updateBhw, deleteBhw,
  getSk, createSk, updateSk, deleteSk
};