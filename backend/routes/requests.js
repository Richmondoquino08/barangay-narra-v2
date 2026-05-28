const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const requestController = require('../controllers/requestController');

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

// Get all requests
router.get('/', requireRole(['admin', 'secretary', 'captain', 'treasurer']), requestController.getAllRequests);

// Get single request
router.get('/:id', requireRole(['admin', 'secretary', 'captain', 'treasurer']), requestController.getRequest);

// Create request
router.post(
  '/',
  requireRole(['admin', 'secretary', 'captain']),
  [
    body('resident_id').notEmpty().withMessage('Resident is required'),
    body('request_type').notEmpty().withMessage('Request type is required'),
    body('purpose').notEmpty().withMessage('Purpose is required')
  ],
  validateRequest,
  requestController.createRequest
);

// Update request
router.put('/:id', requireRole(['admin', 'secretary']), requestController.updateRequest);

// Approve request
router.patch('/:id/approve', requireRole(['admin', 'secretary', 'captain']), requestController.approveRequest);

// Reject request
router.patch('/:id/reject', requireRole(['admin', 'secretary', 'captain']), requestController.rejectRequest);

// Process request
router.patch('/:id/process', requireRole(['admin', 'secretary']), requestController.processRequest);

// Complete request
router.patch('/:id/complete', requireRole(['admin', 'secretary']), requestController.completeRequest);

// Delete request
router.delete('/:id', requireRole(['admin']), requestController.deleteRequest);

// Export PDF
router.get('/:id/pdf', requireRole(['admin', 'secretary', 'captain', 'treasurer']), requestController.exportPdf);

// Get QR Code
router.get('/:id/qr', requireRole(['admin', 'secretary', 'captain', 'treasurer']), requestController.getQrCode);

module.exports = router;
