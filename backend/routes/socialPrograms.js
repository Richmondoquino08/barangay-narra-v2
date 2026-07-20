const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const c = require('../controllers/socialProgramsController');
const router = express.Router();
router.use(requireAuth);

// 4Ps
router.get('/4ps', c.get4Ps);
router.post('/4ps', requireRole('admin', 'secretary'), c.create4Ps);
router.put('/4ps/:id', requireRole('admin', 'secretary'), c.update4Ps);
router.delete('/4ps/:id', requireRole('admin', 'secretary'), c.delete4Ps);

// PWD
router.get('/pwd', c.getPwd);
router.post('/pwd', requireRole('admin', 'secretary'), c.createPwd);
router.put('/pwd/:id', requireRole('admin', 'secretary'), c.updatePwd);
router.delete('/pwd/:id', requireRole('admin', 'secretary'), c.deletePwd);

// OSCA / Senior Citizens
router.get('/osca', c.getOsca);
router.post('/osca', requireRole('admin', 'secretary'), c.createOsca);
router.put('/osca/:id', requireRole('admin', 'secretary'), c.updateOsca);
router.delete('/osca/:id', requireRole('admin', 'secretary'), c.deleteOsca);

// BHW
router.get('/bhw', c.getBhw);
router.post('/bhw', requireRole('admin', 'secretary'), c.createBhw);
router.put('/bhw/:id', requireRole('admin', 'secretary'), c.updateBhw);
router.delete('/bhw/:id', requireRole('admin', 'secretary'), c.deleteBhw);

// SK
router.get('/sk', c.getSk);
router.post('/sk', requireRole('admin', 'secretary'), c.createSk);
router.put('/sk/:id', requireRole('admin', 'secretary'), c.updateSk);
router.delete('/sk/:id', requireRole('admin', 'secretary'), c.deleteSk);

module.exports = router;