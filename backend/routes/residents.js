const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const residentController = require('../controllers/residentController');

const router = express.Router();
router.use(requireAuth);

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/profiles/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Validation middleware
const validateResident = [
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  body('birth_date').isISO8601().withMessage('Valid birth date is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('civil_status').isIn(['single', 'married', 'divorced', 'widowed']).withMessage('Invalid civil status')
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

// Routes
// Get all residents with pagination
router.get('/', requireRole('admin', 'secretary', 'captain', 'treasurer'), residentController.getAllResidents);

// Search residents
router.get('/search/query', requireRole('admin', 'secretary', 'captain', 'treasurer'), residentController.searchResidents);

// Export residents to CSV
router.get('/export/csv', requireRole('admin', 'secretary'), residentController.exportResidents);

// Get resident by ID
router.get('/:id', requireRole('admin', 'secretary', 'captain', 'treasurer'), residentController.getResidentById);

// Create resident
router.post('/', 
  requireRole('admin', 'secretary'),
  validateResident,
  handleValidationErrors,
  residentController.createResident
);

// Update resident
router.put('/:id',
  requireRole('admin', 'secretary'),
  validateResident,
  handleValidationErrors,
  residentController.updateResident
);

// Delete resident
router.delete('/:id', requireRole('admin'), residentController.deleteResident);

module.exports = router;
