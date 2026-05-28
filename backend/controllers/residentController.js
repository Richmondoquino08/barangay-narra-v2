const pool = require('../config/db');

const calculateAge = (birthdate) => {
  const birth = new Date(birthdate);
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / 31557600000);
};

exports.getAllResidents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [residents] = await pool.query(
      'SELECT id, first_name, middle_name, last_name, gender, birth_date, address, civil_status, contact_number, occupation, voter_status, senior_citizen, household_id, profile_image_url, created_at FROM residents ORDER BY last_name, first_name ASC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const [countResult] = await pool.query('SELECT COUNT(*) as count FROM residents');
    const total = parseInt(countResult[0]?.count || 0);

    const residentsList = residents.map(r => ({
      ...r,
      age: calculateAge(r.birth_date),
      full_name: `${r.first_name}${r.middle_name ? ' ' + r.middle_name : ''} ${r.last_name}`
    }));

    res.json({ success: true, count: residentsList.length, total, page, limit, residents: residentsList });
  } catch (error) {
    console.error('Get all residents error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch residents' });
  }
};

exports.searchResidents = async (req, res) => {
  try {
    const { q, voter_status, senior_citizen, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT id, first_name, middle_name, last_name, gender, birth_date, address,
      civil_status, contact_number, occupation, voter_status, senior_citizen,
      household_id, profile_image_url, created_at FROM residents WHERE 1=1`;
    const params = [];

    if (q) {
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      query += ` AND (first_name || ' ' || COALESCE(middle_name, '') || ' ' || last_name ILIKE ? OR address ILIKE ? OR contact_number ILIKE ?)`;
    }

    if (voter_status !== undefined) {
      params.push(voter_status === 'true');
      query += ' AND voter_status = ?';
    }

    if (senior_citizen !== undefined) {
      params.push(senior_citizen === 'true');
      query += ' AND senior_citizen = ?';
    }

    query += ' ORDER BY last_name, first_name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [residents] = await pool.query(query, params);

    const residentsList = residents.map(r => ({
      ...r,
      age: calculateAge(r.birth_date),
      full_name: `${r.first_name}${r.middle_name ? ' ' + r.middle_name : ''} ${r.last_name}`
    }));

    res.json({ success: true, count: residentsList.length, residents: residentsList });
  } catch (error) {
    console.error('Search residents error:', error);
    res.status(500).json({ success: false, message: 'Failed to search residents' });
  }
};

exports.getResidentById = async (req, res) => {
  try {
    const { id } = req.params;
    const [residents] = await pool.query('SELECT * FROM residents WHERE id = ?', [id]);

    if (residents.length === 0) {
      return res.status(404).json({ success: false, message: 'Resident not found' });
    }

    const resident = residents[0];
    res.json({
      success: true,
      resident: {
        ...resident,
        age: calculateAge(resident.birth_date),
        full_name: `${resident.first_name}${resident.middle_name ? ' ' + resident.middle_name : ''} ${resident.last_name}`
      }
    });
  } catch (error) {
    console.error('Get resident error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch resident' });
  }
};

exports.createResident = async (req, res) => {
  try {
    const {
      first_name, middle_name, last_name, gender, birth_date,
      address, civil_status, contact_number, occupation,
      voter_status = false, senior_citizen = false, household_id
    } = req.body;

    if (!first_name || !last_name || !gender || !birth_date || !address || !civil_status) {
      return res.status(400).json({ success: false, message: 'Required fields are missing' });
    }

    const [result] = await pool.query(
      'INSERT INTO residents (first_name, middle_name, last_name, gender, birth_date, address, civil_status, contact_number, occupation, voter_status, senior_citizen, household_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [first_name, middle_name || null, last_name, gender, birth_date, address, civil_status,
       contact_number || null, occupation || null, voter_status, senior_citizen,
       household_id || null, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Resident created successfully',
      resident: {
        id: result.insertId, first_name, middle_name, last_name,
        full_name: `${first_name}${middle_name ? ' ' + middle_name : ''} ${last_name}`,
        gender, birth_date, address, civil_status, contact_number,
        occupation, voter_status, senior_citizen, household_id
      }
    });
  } catch (error) {
    console.error('Create resident error:', error);
    res.status(500).json({ success: false, message: 'Failed to create resident' });
  }
};

exports.updateResident = async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = ['first_name', 'middle_name', 'last_name', 'gender', 'birth_date',
      'address', 'civil_status', 'contact_number', 'occupation', 'voter_status',
      'senior_citizen', 'household_id'];

    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const updateClauses = Object.keys(updates).map(key => `${key} = ?`);
    const updateValues = [...Object.values(updates), id];

    const [result] = await pool.query(
      `UPDATE residents SET ${updateClauses.join(', ')}, updated_at = NOW() WHERE id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Resident not found' });
    }

    res.json({ success: true, message: 'Resident updated successfully' });
  } catch (error) {
    console.error('Update resident error:', error);
    res.status(500).json({ success: false, message: 'Failed to update resident' });
  }
};

exports.deleteResident = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM residents WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Resident not found' });
    }

    res.json({ success: true, message: 'Resident deleted successfully' });
  } catch (error) {
    console.error('Delete resident error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete resident' });
  }
};

exports.exportResidents = async (req, res) => {
  try {
    const [residents] = await pool.query(
      'SELECT id, first_name, middle_name, last_name, gender, birth_date, address, civil_status, contact_number, occupation, voter_status, senior_citizen, created_at FROM residents ORDER BY last_name'
    );

    const csv = [
      ['ID', 'First Name', 'Middle Name', 'Last Name', 'Gender', 'Birth Date', 'Address',
       'Civil Status', 'Contact', 'Occupation', 'Voter', 'Senior Citizen', 'Created At'].join(',')
    ];

    residents.forEach(r => {
      csv.push([
        r.id, `"${r.first_name}"`, `"${r.middle_name || ''}"`, `"${r.last_name}"`,
        r.gender, r.birth_date, `"${r.address}"`, r.civil_status,
        r.contact_number || '', `"${r.occupation || ''}"`,
        r.voter_status ? 'Yes' : 'No', r.senior_citizen ? 'Yes' : 'No', r.created_at
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=residents.csv');
    res.send(csv.join('\n'));
  } catch (error) {
    console.error('Export residents error:', error);
    res.status(500).json({ success: false, message: 'Failed to export residents' });
  }
};