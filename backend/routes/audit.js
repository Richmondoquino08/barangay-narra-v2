const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const auditController = require('../controllers/auditController');

const router = express.Router();
router.use(requireAuth);
router.get('/', requireRole('admin'), auditController.getAuditLogs);
router.get('/history', requireRole('admin'), auditController.loginHistory);

module.exports = router;
