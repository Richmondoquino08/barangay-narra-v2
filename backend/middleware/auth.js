const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication token required' 
      });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'barangay-secret-key-2024', (err, decoded) => {
      if (err) {
        return res.status(403).json({ 
          success: false,
          message: 'Invalid or expired token' 
        });
      }
      
      req.user = decoded;
      next();
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      message: 'Authentication error' 
    });
  }
};

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET || 'barangay-secret-key-2024', (err, decoded) => {
        if (!err) {
          req.user = decoded;
        }
      });
    }
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = { requireAuth, optionalAuth };
