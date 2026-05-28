const pool = require('../config/db');

// Calculate age from birth date
const calculateAge = (birthdate) => {
  const birth = new Date(birthdate);
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / 31557600000);
};

// Get all residents with pagination
exports.getAllResidents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const connection = await pool.getConnection();
    
    const [residents] = await connection.query(
      'SELECT id, first_name, middle_name, last_name, gender, birth_date, address, civil_status, contact_number, occupation, voter_status, senior_citizen, household_id, profile_image_url, created_at FROM residents ORDER BY last_name, first_name ASC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const [countResult] = await connection.query('SELECT COUNT(*) as count FROM residents');
    connection.release();

    const residentsList = residents.map(r => ({
      ...r,
      age: calculateAge(r.birth_date),
      full_name: `${r.first_name} ${r.middle_name ? r.middle_name + ' ' : ''}${r.last_name}`
    }));

    res.json({
      success: true,
      count: residentsList.length,
      total: countResult[0].count,
      page,
      limit,
      residents: residentsList
    });
  } catch (error) {
    console.error('Get all residents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch residents'
    });
  }
};

// Search residents
exports.searchResidents = async (req, res) => {
  try {
    const { q, voter_status, senior_citizen, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT id, first_name, middle_name, last_name, gender, birth_date, address, civil_status, contact_number, occupation, voter_status, senior_citizen, household_id, profile_image_url, created_at FROM residents WHERE 1=1';
    const params = [];

    if (q) {
      query += ' AND (CONCAT(first_name, " ", middle_name, " ", last_name) LIKE ? OR address LIKE ? OR contact_number LIKE ?)';
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (voter_status !== undefined) {
      query += ' AND voter_status = ?';
      params.push(voter_status === 'true');
    }

    if (senior_citizen !== undefined) {
      query += ' AND senior_citizen = ?';
      params.push(senior_citizen === 'true');
    }

    query += ' ORDER BY last_name, first_name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const connection = await pool.getConnection();
    const [residents] = await connection.query(query, params);
    connection.release();

    const residentsList = residents.map(r => ({
      ...r,
      age: calculateAge(r.birth_date),
      full_name: `${r.first_name} ${r.middle_name ? r.middle_name + ' ' : ''}${r.last_name}`
    }));

    res.json({
      success: true,
      count: residentsList.length,
      residents: residentsList
    });
  } catch (error) {
    console.error('Search residents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search residents'
    });
  }
};

// Get resident by ID
exports.getResidentById = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    const [residents] = await connection.query(
      'SELECT * FROM residents WHERE id = ?',
      [id]
    );
    connection.release();

    if (residents.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resident not found'
      });
    }

    const resident = residents[0];
    res.json({
      success: true,
      resident: {
        ...resident,
        age: calculateAge(resident.birth_date),
        full_name: `${resident.first_name} ${resident.middle_name ? resident.middle_name + ' ' : ''}${resident.last_name}`
      }
    });
  } catch (error) {
    console.error('Get resident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resident'
    });
  }
};

// Create resident
exports.createResident = async (req, res) => {
  try {
    const { first_name, middle_name, last_name, gender, birth_date, address, civil_status, contact_number, occupation, voter_status = false, senior_citizen = false, household_id } = req.body;

    if (!first_name || !last_name || !gender || !birth_date || !address || !civil_status) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing'
      });
    }

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO residents (first_name, middle_name, last_name, gender, birth_date, address, civil_status, contact_number, occupation, voter_status, senior_citizen, household_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [first_name, middle_name, last_name, gender, birth_date, address, civil_status, contact_number, occupation, voter_status, senior_citizen, household_id, req.user.id]
    );
    connection.release();

    res.status(201).json({
      success: true,
      message: 'Resident created successfully',
      resident: {
        id: result.insertId,
        first_name,
        middle_name,
        last_name,
        full_name: `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`,
        gender,
        birth_date,
        address,
        civil_status,
        contact_number,
        occupation,
        voter_status,
        senior_citizen,
        household_id
      }
    });
  } catch (error) {
    console.error('Create resident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create resident'
    });
  }
};

// Update resident
exports.updateResident = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    const allowedFields = ['first_name', 'middle_name', 'last_name', 'gender', 'birth_date', 'address', 'civil_status', 'contact_number', 'occupation', 'voter_status', 'senior_citizen', 'household_id'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    const updateClauses = Object.keys(updates).map(key => `${key} = ?`);
    const updateValues = Object.values(updates);
    updateValues.push(id);

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      `UPDATE residents SET ${updateClauses.join(', ')}, updated_at = NOW() WHERE id = ?`,
      updateValues
    );
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resident not found'
      });
    }

    res.json({
      success: true,
      message: 'Resident updated successfully'
    });
  } catch (error) {
    console.error('Update resident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update resident'
    });
  }
};

// Delete resident
exports.deleteResident = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'DELETE FROM residents WHERE id = ?',
      [id]
    );
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resident not found'
      });
    }

    res.json({
      success: true,
      message: 'Resident deleted successfully'
    });
  } catch (error) {
    console.error('Delete resident error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete resident'
    });
  }
};

// Export residents to CSV
exports.exportResidents = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [residents] = await connection.query(
      'SELECT id, first_name, middle_name, last_name, gender, birth_date, address, civil_status, contact_number, occupation, voter_status, senior_citizen, created_at FROM residents ORDER BY last_name'
    );
    connection.release();

    const csv = [
      ['ID', 'First Name', 'Middle Name', 'Last Name', 'Gender', 'Birth Date', 'Address', 'Civil Status', 'Contact', 'Occupation', 'Voter', 'Senior Citizen', 'Created At'].join(',')
    ];

    residents.forEach(r => {
      csv.push([
        r.id,
        `"${r.first_name}"`,
        `"${r.middle_name || ''}"`,
        `"${r.last_name}"`,
        r.gender,
        r.birth_date,
        `"${r.address}"`,
        r.civil_status,
        r.contact_number,
        `"${r.occupation || ''}"`,
        r.voter_status ? 'Yes' : 'No',
        r.senior_citizen ? 'Yes' : 'No',
        r.created_at
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=residents.csv');
    res.send(csv.join('\n'));
  } catch (error) {
    console.error('Export residents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export residents'
    });
  }
};
