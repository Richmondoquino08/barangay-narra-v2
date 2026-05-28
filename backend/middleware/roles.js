const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: 'Insufficient permissions for this action' 
      });
    }

    next();
  };
};

const checkRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }

    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const hasRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({ 
        success: false,
        message: 'Insufficient permissions for this action' 
      });
    }

    next();
  };
};

// Role checking helper
const isAdmin = (user) => user && user.role === 'admin';
const isSecretary = (user) => user && user.role === 'secretary';
const isCaptain = (user) => user && user.role === 'captain';
const isTreasurer = (user) => user && user.role === 'treasurer';

module.exports = { requireRole, checkRole, isAdmin, isSecretary, isCaptain, isTreasurer };
