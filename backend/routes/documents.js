const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const documentController = require('../controllers/documentController');

const upload = multer({ dest: 'uploads/documents/' });
const router = express.Router();
router.use(requireAuth);

router.get('/', requireRole('admin', 'treasurer', 'secretary', 'captain'), documentController.getDocuments);
router.post('/', requireRole('admin', 'secretary'), upload.single('file'), documentController.uploadDocument);
router.post('/upload', requireRole('admin', 'secretary'), upload.single('file'), documentController.uploadDocument);
router.delete('/:id', requireRole('admin', 'secretary'), documentController.deleteDocument);

module.exports = router;
