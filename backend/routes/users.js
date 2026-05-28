const express = require('express');
const { body, validationResult } = require('express-validator');
const usersController = require('../controllers/usersController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();
router.use(requireAuth);

// Validation middleware
const validateUser = [
  body('full_name').optional().isLength({ min: 3 }).withMessage('Full name must be at least 3 characters'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['admin', 'secretary', 'captain', 'treasurer']).withMessage('Invalid role')
];

const validateUserCreate = [
  body('full_name').isLength({ min: 3 }).withMessage('Full name must be at least 3 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'secretary', 'captain', 'treasurer']).withMessage('Invalid role')
];

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

// Get all users (admin only)
router.get('/', requireRole('admin'), usersController.getAllUsers);

// Get user by ID
router.get('/:id', usersController.getUser);

// Create user (admin only)
router.post('/', requireRole('admin'), validateUserCreate, handleValidationErrors, usersController.createUser);

// Update user
router.put('/:id', validateUser, handleValidationErrors, usersController.updateUser);

// Delete user (admin only)
router.delete('/:id', requireRole('admin'), usersController.deleteUser);

// Toggle user status (admin only)
router.patch('/:id/toggle-status', requireRole('admin'), usersController.toggleUserStatus);

// Reset password (admin only)
router.post('/:id/reset-password', requireRole('admin'), [
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], handleValidationErrors, usersController.resetPassword);

module.exports = router;
