const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const c = require('../controllers/drrmController');
const router = express.Router();
router.use(requireAuth);

router.get('/', c.getAll);
router.post('/', requireRole('admin', 'secretary', 'captain'), c.create);
router.put('/:id', requireRole('admin', 'secretary', 'captain'), c.update);
router.delete('/:id', requireRole('admin'), c.remove);

module.exports = router;