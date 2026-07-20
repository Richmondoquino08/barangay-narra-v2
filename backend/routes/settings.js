const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { getSettings, saveSettings, uploadAsset, clearAsset } = require('../controllers/settingsController');

// app.js creates this directory at startup
const uploadDir = path.join(__dirname, '../uploads/settings');

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename:    (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  },
});

const router = express.Router();

// GET is PUBLIC — needed by login page before authentication
router.get('/', getSettings);

// All write operations require admin
router.post('/',              requireAuth, requireRole('admin'), saveSettings);
router.post('/upload/:type',  requireAuth, requireRole('admin'), upload.single('file'), uploadAsset);
router.post('/clear/:type',   requireAuth, requireRole('admin'), clearAsset);

module.exports = router;
