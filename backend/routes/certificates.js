const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const certificatesController = require('../controllers/certificatesController');

const router = express.Router();
router.use(requireAuth);

// Configure multer for template uploads
const upload = multer({
  dest: 'uploads/templates/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only DOCX and PDF files are allowed'));
    }
  }
});

// Validation middleware
const validateTemplate = [
  body('template_name').notEmpty().withMessage('Template name is required'),
  body('certificate_type').isIn(['barangay_clearance', 'indigency', 'residency', 'business_permit']).withMessage('Invalid certificate type')
];

const validateCertificate = [
  body('resident_id').isInt().withMessage('Valid resident ID is required'),
  body('certificate_type').isIn(['barangay_clearance', 'indigency', 'residency', 'business_permit']).withMessage('Invalid certificate type'),
  body('purpose').optional()
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

// Template routes
// Upload certificate template (secretary, admin)
router.post('/templates/upload', 
  requireRole('admin', 'secretary'),
  upload.single('template'),
  validateTemplate,
  handleValidationErrors,
  certificatesController.uploadTemplate
);

// Get all templates
router.get('/templates', certificatesController.getTemplates);

// Get template by ID
router.get('/templates/:id', certificatesController.getTemplateById);

// Delete template (admin, secretary)
router.delete('/templates/:id', requireRole('admin', 'secretary'), certificatesController.deleteTemplate);

// Certificate routes
// Generate certificate (secretary)
router.post('/generate',
  requireRole('admin', 'secretary'),
  validateCertificate,
  handleValidationErrors,
  certificatesController.generateCertificate
);

// Get certificates
router.get('/', certificatesController.getCertificates);

// Get certificate statistics
router.get('/stats/overview', certificatesController.getCertificateStats);

// Get certificate by ID
router.get('/:id', certificatesController.getCertificateById);

// Approve certificate (captain, admin)
router.patch('/:id/approve', 
  requireRole('admin', 'captain'),
  certificatesController.approveCertificate
);

// Reject certificate (captain, admin)
router.patch('/:id/reject',
  requireRole('admin', 'captain'),
  certificatesController.rejectCertificate
);

// Delete certificate
router.delete('/:id', requireRole('admin'), certificatesController.deleteCertificate);

module.exports = router;
