const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const collections = require('../controllers/collectionsController');
const router = express.Router();
router.use(requireAuth);

const W = requireRole('admin', 'treasurer');

router.get('/',        collections.list);
router.post('/',    W, collections.create);
router.put('/:id', W, collections.update);
router.delete('/:id', W, collections.remove);

module.exports = router;
