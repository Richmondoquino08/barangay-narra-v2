const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const settingsController = require('../controllers/settingsController');

const router = express.Router();
router.use(requireAuth);

router.get('/', requireRole('admin', 'treasurer', 'secretary', 'captain'), settingsController.getSettings);
router.post(
  '/',
  requireRole('admin'),
  body('barangay_name').notEmpty(),
  body('address').notEmpty(),
  body('captain').notEmpty(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  },
  settingsController.saveSettings
);

module.exports = router;
