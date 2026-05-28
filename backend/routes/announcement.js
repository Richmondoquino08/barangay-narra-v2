const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const announcementController = require('../controllers/announcementController');

const router = express.Router();
router.use(requireAuth);

router.get('/', requireRole('admin', 'treasurer', 'secretary', 'captain'), announcementController.getAnnouncements);
router.post(
  '/',
  requireRole('admin', 'secretary'),
  body('title').notEmpty(),
  body('message').notEmpty(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  },
  announcementController.createAnnouncement
);
router.put('/:id', requireRole('admin', 'secretary'), announcementController.updateAnnouncement);
router.delete('/:id', requireRole('admin', 'secretary'), announcementController.deleteAnnouncement);

module.exports = router;

module.exports = router;
