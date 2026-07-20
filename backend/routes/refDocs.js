const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const c = require('../controllers/refDocsController');
const router = express.Router();
router.use(requireAuth);

const uploadDir = path.join(__dirname, '../uploads/ref-docs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename: (_, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_, file, cb) => {
    const ok = /pdf|docx|doc|xlsx|xls|png|jpg|jpeg/i.test(path.extname(file.originalname));
    cb(null, ok);
  },
});

router.get('/', c.getAll);
router.post('/', requireRole('admin', 'secretary'), upload.single('file'), c.upload);
router.get('/:id/download', c.download);
router.delete('/:id', requireRole('admin', 'secretary'), c.remove);

module.exports = router;
