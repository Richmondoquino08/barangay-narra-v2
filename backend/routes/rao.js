const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const rao = require('../controllers/raoController');
const router = express.Router();
router.use(requireAuth);

const W = requireRole('admin', 'treasurer');

router.get('/funds',     rao.summary);
router.get('/entries',   rao.list);
router.post('/entries',    W, rao.create);
router.put('/entries/:id', W, rao.update);
router.delete('/entries/:id', W, rao.remove);

module.exports = router;
