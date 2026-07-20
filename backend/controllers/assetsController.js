const db = require('../config/db');

async function getAll(req, res, next) {
  try {
    const { category, condition } = req.query;
    let sql = 'SELECT * FROM assets_inventory WHERE 1=1';
    const params = [];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (condition) { sql += ' AND condition = ?'; params.push(condition); }
    sql += ' ORDER BY item_name';
    const [rows] = await db.query(sql, params);
    res.json({ assets: rows });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { item_name, description, category, quantity, unit, condition,
      property_number, acquisition_date, acquisition_cost, location, assigned_to, notes } = req.body;
    if (!item_name) return res.status(400).json({ message: 'Item name required' });
    const [r] = await db.query(
      `INSERT INTO assets_inventory
        (item_name, description, category, quantity, unit, condition, property_number,
         acquisition_date, acquisition_cost, location, assigned_to, notes, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [item_name, description || null, category || null, quantity || 1, unit || null,
       condition || 'Good', property_number || null, acquisition_date || null,
       acquisition_cost || null, location || null, assigned_to || null, notes || null, req.user.id]
    );
    res.status(201).json({ message: 'Asset recorded', id: r.insertId });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { item_name, description, category, quantity, unit, condition,
      property_number, acquisition_date, acquisition_cost, location, assigned_to, notes } = req.body;
    await db.query(
      `UPDATE assets_inventory SET item_name=?, description=?, category=?, quantity=?, unit=?,
       condition=?, property_number=?, acquisition_date=?, acquisition_cost=?,
       location=?, assigned_to=?, notes=?, updated_at=NOW() WHERE id=?`,
      [item_name, description || null, category || null, quantity || 1, unit || null,
       condition || 'Good', property_number || null, acquisition_date || null,
       acquisition_cost || null, location || null, assigned_to || null, notes || null, id]
    );
    res.json({ message: 'Asset updated' });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await db.query('DELETE FROM assets_inventory WHERE id = ?', [req.params.id]);
    res.json({ message: 'Asset deleted' });
  } catch (err) { next(err); }
}

module.exports = { getAll, create, update, remove };