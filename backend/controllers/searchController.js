const db = require('../config/db');

exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    const term = q && q.trim();
    if (!term || term.length < 2) {
      return res.json({ results: { residents: [], certificates: [], blotters: [], requests: [] } });
    }

    const like = `%${term}%`;

    const [[resRows], [certRows], [blotRows], [reqRows]] = await Promise.all([
      db.query(
        `SELECT id,
           first_name || ' ' || last_name AS name,
           purok, address, contact_number
         FROM residents
         WHERE first_name || ' ' || last_name ILIKE ?
            OR contact_number ILIKE ?
            OR address ILIKE ?
         ORDER BY first_name ASC LIMIT 5`,
        [like, like, like]
      ),
      db.query(
        `SELECT c.id, c.certificate_type, c.status,
           r.first_name || ' ' || r.last_name AS resident_name
         FROM certificates c
         JOIN residents r ON c.resident_id = r.id
         WHERE r.first_name || ' ' || r.last_name ILIKE ?
            OR REPLACE(c.certificate_type,'_',' ') ILIKE ?
         ORDER BY c.created_at DESC LIMIT 5`,
        [like, like]
      ),
      db.query(
        `SELECT b.id, b.case_number, b.incident_type, b.status,
           COALESCE(c.first_name || ' ' || c.last_name, '') AS complainant_name
         FROM blotter_records b
         LEFT JOIN residents c ON b.complainant_id = c.id
         WHERE b.case_number ILIKE ?
            OR c.first_name || ' ' || c.last_name ILIKE ?
            OR REPLACE(b.incident_type,'_',' ') ILIKE ?
         ORDER BY b.created_at DESC LIMIT 5`,
        [like, like, like]
      ),
      db.query(
        `SELECT rq.id, rq.request_type, rq.status,
           res.first_name || ' ' || res.last_name AS resident_name
         FROM requests rq
         LEFT JOIN residents res ON rq.resident_id = res.id
         WHERE res.first_name || ' ' || res.last_name ILIKE ?
            OR REPLACE(rq.request_type,'_',' ') ILIKE ?
         ORDER BY rq.created_at DESC LIMIT 5`,
        [like, like]
      ),
    ]);

    res.json({
      results: {
        residents:    resRows.map(r => ({ id: r.id, name: r.name, sub: r.purok || r.address || '' })),
        certificates: certRows.map(c => ({ id: c.id, name: c.resident_name, sub: (c.certificate_type || '').replace(/_/g, ' '), status: c.status })),
        blotters:     blotRows.map(b => ({ id: b.id, name: b.case_number || b.complainant_name, sub: (b.incident_type || '').replace(/_/g, ' '), complainant: b.complainant_name, status: b.status })),
        requests:     reqRows.map(r => ({ id: r.id, name: r.resident_name || '—', sub: (r.request_type || '').replace(/_/g, ' '), status: r.status })),
      },
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
};
