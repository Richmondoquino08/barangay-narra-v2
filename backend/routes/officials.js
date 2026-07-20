const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const c = require('../controllers/officialsController');
const router = express.Router();
router.use(requireAuth);

router.get('/', c.getAll);
router.post('/', requireRole('admin', 'secretary'), c.create);
router.put('/:id', requireRole('admin', 'secretary'), c.update);
router.delete('/:id', requireRole('admin'), c.remove);

module.exports = router;