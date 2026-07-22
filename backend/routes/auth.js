const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

// Validation middleware
const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const validateRegister = [
  body('full_name').isLength({ min: 3 }).withMessage('Full name must be at least 3 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'secretary', 'captain', 'treasurer', 'intern']).withMessage('Invalid role')
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

// Login endpoint
router.post('/login', validateLogin, handleValidationErrors, authController.login);

// Register endpoint (open or admin only)
router.post('/register', validateRegister, handleValidationErrors, authController.register);

// Get current user (protected)
router.get('/me', requireAuth, authController.getMe);

// Verify token (protected)
router.get('/verify', requireAuth, authController.verifyToken);

// Change password (protected)
router.post('/change-password', requireAuth, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], handleValidationErrors, authController.changePassword);

// Logout (client-side only, but can be used for cleanup)
router.post('/logout', requireAuth, authController.logout);

module.exports = router;
