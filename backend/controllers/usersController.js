const bcryptjs = require('bcryptjs');
const pool = require('../config/db');
const { isAdmin } = require('../middleware/roles');
const auditService = require('../services/auditService');

exports.getAllUsers = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Only admins can view all users' });
    }

    const [users] = await pool.query(
      'SELECT id, full_name, email, role, resident_id, is_active, last_login, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({ success: true, count: users.length, users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

exports.getUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id !== parseInt(id) && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this user' });
    }

    const [users] = await pool.query(
      'SELECT id, full_name, email, role, resident_id, is_active, last_login, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: users[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
};

exports.createUser = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Only admins can create users' });
    }

    const { full_name, email, password, role, resident_id } = req.body;

    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Full name, email, password, and role are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Every account except admin must be linked to an actual resident of the
    // barangay — staff accounts represent real people who live here.
    if (role !== 'admin' && !resident_id) {
      return res.status(400).json({ success: false, message: 'Select the resident this account belongs to' });
    }

    let residentName = null;
    if (resident_id) {
      const [resRows] = await pool.query(
        `SELECT first_name, middle_name, last_name FROM residents WHERE id = ?`, [resident_id]
      );
      if (resRows.length === 0) {
        return res.status(400).json({ success: false, message: 'Selected resident was not found' });
      }
      const r = resRows[0];
      residentName = `${r.first_name}${r.middle_name ? ' ' + r.middle_name : ''} ${r.last_name}`;
      const [linked] = await pool.query('SELECT id FROM users WHERE resident_id = ?', [resident_id]);
      if (linked.length > 0) {
        return res.status(409).json({ success: false, message: 'That resident already has an account' });
      }
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const [, result] = await pool.query(
      'INSERT INTO users (full_name, email, password, role, resident_id, is_active) VALUES (?, ?, ?, ?, ?, true)',
      [full_name, email, hashedPassword, role, role === 'admin' ? (resident_id || null) : resident_id]
    );

    if (resident_id) {
      await auditService.logAction(req.user.id, 'link_resident_to_user',
        `Linked account "${full_name}" (${email}) to resident #${resident_id} (${residentName})`);
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: { id: result.insertId, full_name, email, role, resident_id: resident_id || null }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, role, resident_id } = req.body;

    if (req.user.id !== parseInt(id) && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this user' });
    }

    if (email) {
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'Email already exists' });
      }
    }

    let residentChanged = false;
    let residentName = null;
    if (resident_id && isAdmin(req.user)) {
      const [current] = await pool.query('SELECT resident_id FROM users WHERE id = ?', [id]);
      residentChanged = String(current[0]?.resident_id) !== String(resident_id);

      if (residentChanged) {
        const [resRows] = await pool.query(
          `SELECT first_name, middle_name, last_name FROM residents WHERE id = ?`, [resident_id]
        );
        if (resRows.length === 0) {
          return res.status(400).json({ success: false, message: 'Selected resident was not found' });
        }
        const r = resRows[0];
        residentName = `${r.first_name}${r.middle_name ? ' ' + r.middle_name : ''} ${r.last_name}`;
        const [linked] = await pool.query('SELECT id FROM users WHERE resident_id = ? AND id != ?', [resident_id, id]);
        if (linked.length > 0) {
          return res.status(409).json({ success: false, message: 'That resident already has an account' });
        }
      }
    }

    const updateFields = [];
    const updateValues = [];

    if (full_name) { updateFields.push('full_name = ?'); updateValues.push(full_name); }
    if (email) { updateFields.push('email = ?'); updateValues.push(email); }
    if (role && isAdmin(req.user)) { updateFields.push('role = ?'); updateValues.push(role); }
    if (resident_id && isAdmin(req.user)) { updateFields.push('resident_id = ?'); updateValues.push(resident_id); }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    await pool.query(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);

    if (residentChanged) {
      await auditService.logAction(req.user.id, 'link_resident_to_user',
        `Linked account #${id} (${full_name || email || ''}) to resident #${resident_id} (${residentName})`);
    }

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Only admins can delete users' });
    }

    if (req.user.id === parseInt(id)) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const [, result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Only admins can toggle user status' });
    }

    const [users] = await pool.query('SELECT is_active FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newStatus = !users[0].is_active;
    await pool.query('UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?', [newStatus, id]);

    res.json({ success: true, message: `User ${newStatus ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle user status' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Only admins can reset passwords' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    const [, result] = await pool.query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [hashedPassword, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};