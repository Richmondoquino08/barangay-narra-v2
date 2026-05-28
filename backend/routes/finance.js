const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const financeController = require('../controllers/financeController');

const router = express.Router();
router.use(requireAuth);

const validateFinance = [
  body('transaction_type').isIn(['income', 'expense']).withMessage('Invalid transaction type'),
  body('description').notEmpty().withMessage('Description is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
  body('transaction_date').isISO8601().withMessage('Valid date is required')
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

// Get all finances
router.get('/', requireRole('admin', 'treasurer'), financeController.getFinances);

// Get finance statistics
router.get('/stats', requireRole('admin', 'treasurer'), financeController.getFinanceStats);

// Get finance statistics
router.get('/stats/overview', requireRole('admin', 'treasurer'), financeController.getFinanceStats);

// Export to CSV
router.get('/export/csv', requireRole('admin', 'treasurer'), financeController.exportFinances);

// Create finance record
router.post('/', requireRole('admin', 'treasurer'), validateFinance, handleValidationErrors, financeController.createFinance);

// Update finance
router.put('/:id', requireRole('admin', 'treasurer'), financeController.updateFinance);

// Delete finance
router.delete('/:id', requireRole('admin'), financeController.deleteFinance);

module.exports = router;
