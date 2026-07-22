const express = require('express');
const multer = require('multer');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const { allowRoles: requireRole } = require('../middleware/internGuard');
const documentController = require('../controllers/documentController');

// Resident document attachments (scanned IDs, certificates, etc.) — restrict
// to the file types this feature is actually meant for, matching the
// validation pattern already used on the other upload routes.
const upload = multer({
  dest: 'uploads/documents/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|docx?|jpe?g|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /pdf|msword|officedocument.wordprocessingml|jpeg|jpg|png/.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC/DOCX, or image files are allowed'));
    }
  },
});
const router = express.Router();
router.use(requireAuth);

router.get('/', requireRole('admin', 'treasurer', 'secretary', 'captain'), documentController.getDocuments);
router.post('/', requireRole('admin', 'secretary'), upload.single('file'), documentController.uploadDocument);
router.post('/upload', requireRole('admin', 'secretary'), upload.single('file'), documentController.uploadDocument);
router.delete('/:id', requireRole('admin', 'secretary'), documentController.deleteDocument);

module.exports = router;
