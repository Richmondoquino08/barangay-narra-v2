const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const transmittal = require('../controllers/transmittalController');
const router = express.Router();
router.use(requireAuth);

const W = requireRole('admin', 'treasurer', 'secretary');

router.get('/',        transmittal.list);
router.post('/',    W, transmittal.create);
router.put('/:id', W, transmittal.update);
router.delete('/:id', W, transmittal.remove);

module.exports = router;
