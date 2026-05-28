const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const announcementController = require('../controllers/announcementController');

const router = express.Router();
router.use(requireAuth);

// Everyone can read
router.get('/', announcementController.getAnnouncements);

// Admin, secretary, captain can create / update / delete
const canManage = requireRole('admin', 'secretary', 'captain');

router.post(
  '/',
  canManage,
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  },
  announcementController.createAnnouncement
);

router.put('/:id',    canManage, announcementController.updateAnnouncement);
router.delete('/:id', canManage, announcementController.deleteAnnouncement);

module.exports = router;
