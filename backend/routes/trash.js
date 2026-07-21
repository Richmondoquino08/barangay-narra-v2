const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const trashController = require('../controllers/trashController');

const router = express.Router();
router.use(requireAuth);

// Normal user's own trash (their deletions that they haven't hidden)
router.get('/mine', trashController.getMyTrash);

// Admin: every deleted item across all users, including ones a user hid
router.get('/all', requireRole('admin'), trashController.getAllTrash);

// Restore — owner or admin (ownership checked in controller)
router.post('/:id/restore', trashController.restore);

// Normal user's own "delete from trash" — hides it from their view only,
// admin can still see and recover it (see trashController.hide)
router.post('/:id/hide', trashController.hide);

// True permanent delete — admin only
router.delete('/:id', requireRole('admin'), trashController.permanentDelete);

module.exports = router;
