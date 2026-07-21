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
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
    ];
    cb(null, allowedMimes.includes(file.mimetype));
  }
});

// Multer for header images (PNG/JPG/SVG)
const uploadImage = multer({
  dest: 'uploads/templates/',
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, /jpeg|jpg|png|svg|webp/i.test(path.extname(file.originalname)));
  }
});

// All certificate types supported by the system (must match frontend CERT_TYPES
// in Certificates.jsx and the certificates/certificate_templates CHECK constraints).
const CERTIFICATE_TYPES = [
  'barangay_clearance', 'residency', 'indigency', 'business_permit',
  'good_moral', 'ftjs', 'no_income', 'senior_citizen_cert', 'pwd_cert',
  'cohabitation', 'guardianship', 'travel_permit',
  'cert_ftj', 'affidavit_of_loss', 'bail_bond', 'clearance_thumbmark',
  'residency_thumbmark', 'cert_death', 'solo_parent', 'cert_appearance',
  'business_closure', 'cert_loan', 'no_fixed_income', 'cohabitation_dswd',
  'tanod_death_claim', 'delayed_registration', 'cert_employment',
  'permit_to_transfer', 'endorsement_letter',
];

// Validation middleware
const validateTemplate = [
  body('template_name').notEmpty().withMessage('Template name is required'),
  body('certificate_type').isIn(CERTIFICATE_TYPES).withMessage('Invalid certificate type')
];

const validateCertificate = [
  body('resident_id').isInt().withMessage('Valid resident ID is required'),
  body('certificate_type').isIn(CERTIFICATE_TYPES).withMessage('Invalid certificate type'),
  body('purpose').optional(),
  body('custom_fields').optional()
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

// Custom visual templates
router.post('/templates/custom',        requireRole('admin', 'secretary'), certificatesController.createCustomTemplate);
router.put('/templates/:id/custom',     requireRole('admin', 'secretary'), certificatesController.updateCustomTemplate);
router.post('/templates/upload-image',  requireRole('admin', 'secretary'), uploadImage.single('image'), certificatesController.uploadHeaderImage);

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

// Verify a certificate by QR code or numeric ID (staff-only, internal use).
// Must come before the generic '/:id' route below or Express would match
// "/verify" as an :id param instead.
router.get('/verify/:code', certificatesController.verifyCertificate);

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
