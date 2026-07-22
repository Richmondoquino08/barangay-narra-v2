const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { allowRoles: requireRole } = require('../middleware/internGuard');
const blotterController = require('../controllers/blotterController');

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Get all blotter records
router.get('/', requireRole(['admin', 'captain']), blotterController.getRecords);

// Get single blotter record
router.get('/:id', requireRole(['admin', 'captain']), blotterController.getRecord);

// Create blotter record
router.post(
  '/',
  requireRole(['admin', 'captain']),
  [
    body('incident_type').notEmpty().withMessage('Incident type is required'),
    body('incident_date').notEmpty().withMessage('Incident date is required'),
    body('incident_location').notEmpty().withMessage('Location is required'),
    body('narrative').notEmpty().withMessage('Narrative is required')
  ],
  validateRequest,
  blotterController.createRecord
);

// Update blotter record
router.put('/:id', requireRole(['admin', 'captain']), blotterController.updateRecord);

// Update status only
router.patch('/:id/status', requireRole(['admin', 'captain']), blotterController.updateStatus);

// Delete blotter record
router.delete('/:id', requireRole(['admin', 'captain']), blotterController.deleteRecord);

module.exports = router;
