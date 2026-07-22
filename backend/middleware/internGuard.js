const db = require('../config/db');

// Drop-in replacement for requireRole() on routes an intern account should be
// able to see. Interns can always GET; they can only POST/PUT/PATCH/DELETE
// when an admin has turned on system_settings.intern_write_access (Settings
// > Access Control). Every other role behaves exactly like requireRole.
const allowRoles = (...args) => {
  const allowedRoles = args.flat();
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    if (allowedRoles.includes(req.user.role)) return next();

    if (req.user.role === 'intern') {
      if (req.method === 'GET') return next();
      try {
        const [rows] = await db.query('SELECT intern_write_access FROM system_settings LIMIT 1');
        if (rows[0]?.intern_write_access) return next();
      } catch { /* fall through to 403 below */ }
      return res.status(403).json({ success: false, message: 'View-only access — ask an admin to enable editing for interns.' });
    }

    return res.status(403).json({ success: false, message: 'Insufficient permissions for this action' });
  };
};

module.exports = { allowRoles };
