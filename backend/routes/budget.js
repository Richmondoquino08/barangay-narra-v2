const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const c = require('../controllers/budgetController');
const router = express.Router();
router.use(requireAuth);

// Budget declarations
router.get('/',           c.getAllBudgets);
router.get('/current',    c.getBudget);
router.get('/summary',    c.getBudgetSummary);
router.get('/check',      c.checkBudget);
router.post('/',          requireRole('admin','treasurer'), c.saveBudget);

// Salary records
router.get('/salary',     c.getSalaries);
router.post('/salary',    requireRole('admin','treasurer','secretary'), c.createSalary);
router.put('/salary/:id', requireRole('admin','treasurer','secretary'), c.updateSalary);
router.delete('/salary/:id', requireRole('admin','treasurer'), c.deleteSalary);

module.exports = router;