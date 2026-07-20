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
    const { search, purok, voter_status, senior_citizen, is_pwd, is_4ps } = req.query;

    let countSql = 'SELECT COUNT(*) as count FROM residents WHERE 1=1';
    let sql = `SELECT id, first_name, middle_name, last_name, gender, birth_date, address, purok,
      civil_status, contact_number, occupation, voter_status, senior_citizen,
      is_pwd, is_4ps, philhealth_number, household_id, profile_image_url, created_at
      FROM residents WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (search) {
      const clause = ` AND (first_name || ' ' || COALESCE(middle_name, '') || ' ' || last_name ILIKE ? OR address ILIKE ? OR contact_number ILIKE ?)`;
      const v = `%${search}%`;
      sql += clause; countSql += clause;
      params.push(v, v, v); countParams.push(v, v, v);
    }
    if (purok) {
      sql += ' AND purok ILIKE ?'; countSql += ' AND purok ILIKE ?';
      params.push(`%${purok}%`); countParams.push(`%${purok}%`);
    }
    if (voter_status !== undefined && voter_status !== '') {
      sql += ' AND voter_status = ?'; countSql += ' AND voter_status = ?';
      params.push(voter_status === 'true'); countParams.push(voter_status === 'true');
    }
    if (senior_citizen !== undefined && senior_citizen !== '') {
      sql += ' AND senior_citizen = ?'; countSql += ' AND senior_citizen = ?';
      params.push(senior_citizen === 'true'); countParams.push(senior_citizen === 'true');
    }
    if (is_pwd !== undefined && is_pwd !== '') {
      sql += ' AND is_pwd = ?'; countSql += ' AND is_pwd = ?';
      params.push(is_pwd === 'true'); countParams.push(is_pwd === 'true');
    }
    if (is_4ps !== undefined && is_4ps !== '') {
      sql += ' AND is_4ps = ?'; countSql += ' AND is_4ps = ?';
      params.push(is_4ps === 'true'); countParams.push(is_4ps === 'true');
    }

    sql += ' ORDER BY last_name, first_name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [residents] = await pool.query(sql, params);
    const [countResult] = await pool.query(countSql, countParams);
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
      first_name, middle_name, last_name, gender, birth_date, address, purok,
      civil_status, contact_number, occupation, email, nationality, religion,
      educational_attainment, philhealth_number, profile_image_url,
      voter_status = false, senior_citizen = false, is_pwd = false, is_4ps = false, household_id
    } = req.body;

    if (!first_name || !last_name || !gender || !birth_date || !address || !civil_status) {
      return res.status(400).json({ success: false, message: 'Required fields are missing' });
    }

    const [result] = await pool.query(
      `INSERT INTO residents
        (first_name, middle_name, last_name, gender, birth_date, address, purok, civil_status,
         contact_number, occupation, email, nationality, religion, educational_attainment,
         philhealth_number, profile_image_url, voter_status, senior_citizen, is_pwd, is_4ps, household_id, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [first_name, middle_name || null, last_name, gender, birth_date, address, purok || null,
       civil_status, contact_number || null, occupation || null, email || null,
       nationality || 'Filipino', religion || null, educational_attainment || null,
       philhealth_number || null, profile_image_url || null,
       voter_status, senior_citizen, is_pwd, is_4ps,
       household_id || null, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Resident created successfully',
      resident: {
        id: result.insertId, first_name, middle_name, last_name,
        full_name: `${first_name}${middle_name ? ' ' + middle_name : ''} ${last_name}`,
        gender, birth_date, address, purok, civil_status, contact_number,
        occupation, voter_status, senior_citizen, is_pwd, is_4ps, household_id
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
      'address', 'purok', 'civil_status', 'contact_number', 'occupation', 'email',
      'nationality', 'religion', 'educational_attainment', 'philhealth_number',
      'profile_image_url', 'voter_status', 'senior_citizen', 'is_pwd', 'is_4ps', 'household_id'];

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

// ── CSV Template ──────────────────────────────────────────────────────────
exports.getImportTemplate = (req, res) => {
  const headers = [
    'first_name','middle_name','last_name','gender','birth_date',
    'address','purok','civil_status','contact_number','occupation',
    'email','nationality','religion','educational_attainment',
    'philhealth_number','voter_status','senior_citizen','is_pwd','is_4ps'
  ];
  const example = [
    'Juan','Santos','Dela Cruz','male','1990-05-15',
    'Barangay Narra, Narra, Palawan','Purok 1','single','09123456789','Farmer',
    '','Filipino','Roman Catholic','High School',
    '','false','false','false','false'
  ];
  const csv = [headers.join(','), example.map(v => `"${v}"`).join(',')].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=residents_import_template.csv');
  res.send(csv);
};

// ── Bulk Import ───────────────────────────────────────────────────────────
exports.importResidents = async (req, res) => {
  try {
    const { residents: data } = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, message: 'No resident data provided' });
    }

    const VALID_GENDERS = ['male', 'female', 'other'];
    const VALID_CIVIL   = ['single', 'married', 'divorced', 'widowed'];
    const parseBool = v => ['true','yes','1'].includes(String(v || '').toLowerCase().trim());

    let imported = 0;
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const r = data[i];
      const row = i + 2;

      const fn = (r.first_name || r['First Name'] || '').toString().trim();
      const ln = (r.last_name  || r['Last Name']  || '').toString().trim();
      const gn = (r.gender     || r['Gender']     || '').toString().toLowerCase().trim();
      const bd = (r.birth_date || r['Birth Date'] || '').toString().trim();
      const ad = (r.address    || r['Address']    || '').toString().trim();
      const cs = (r.civil_status || r['Civil Status'] || '').toString().toLowerCase().trim();

      if (!fn || !ln || !gn || !bd || !ad || !cs) {
        errors.push({ row, message: `Row ${row}: Missing required fields (first_name, last_name, gender, birth_date, address, civil_status)` });
        continue;
      }
      if (!VALID_GENDERS.includes(gn)) {
        errors.push({ row, message: `Row ${row}: Invalid gender "${gn}" — use: male, female, other` });
        continue;
      }
      if (!VALID_CIVIL.includes(cs)) {
        errors.push({ row, message: `Row ${row}: Invalid civil_status "${cs}" — use: single, married, divorced, widowed` });
        continue;
      }

      try {
        await pool.query(
          `INSERT INTO residents
             (first_name, middle_name, last_name, gender, birth_date, address, purok,
              civil_status, contact_number, occupation, email, nationality, religion,
              educational_attainment, philhealth_number,
              voter_status, senior_citizen, is_pwd, is_4ps, created_by)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            fn,
            (r.middle_name || r['Middle Name'] || '').toString().trim() || null,
            ln, gn, bd, ad,
            (r.purok || r['Purok'] || '').toString().trim() || null,
            cs,
            (r.contact_number || r['Contact Number'] || '').toString().trim() || null,
            (r.occupation || r['Occupation'] || '').toString().trim() || null,
            (r.email || r['Email'] || '').toString().trim() || null,
            (r.nationality || r['Nationality'] || 'Filipino').toString().trim() || 'Filipino',
            (r.religion || r['Religion'] || '').toString().trim() || null,
            (r.educational_attainment || r['Educational Attainment'] || '').toString().trim() || null,
            (r.philhealth_number || r['Philhealth Number'] || '').toString().trim() || null,
            parseBool(r.voter_status   || r['Voter Status']),
            parseBool(r.senior_citizen || r['Senior Citizen']),
            parseBool(r.is_pwd  || r['PWD']),
            parseBool(r.is_4ps  || r['4Ps']),
            req.user.id
          ]
        );
        imported++;
      } catch (err) {
        errors.push({ row, message: `Row ${row}: ${err.message}` });
      }
    }

    res.json({
      success: true,
      message: `Imported ${imported} of ${data.length} records`,
      imported, total: data.length, errors
    });
  } catch (error) {
    console.error('Import residents error:', error);
    res.status(500).json({ success: false, message: 'Failed to import residents' });
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