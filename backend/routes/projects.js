const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const c = require('../controllers/projectsController');
const router = express.Router();
router.use(requireAuth);

router.get('/', c.getAll);
router.post('/', requireRole('admin', 'secretary'), c.create);
router.put('/:id', requireRole('admin', 'secretary'), c.update);
router.patch('/:id/status', requireRole('admin', 'secretary'), c.updateStatus);
router.delete('/:id', requireRole('admin'), c.remove);

module.exports = router;