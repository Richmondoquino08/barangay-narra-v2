const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { crdr, chbr, checksIssued } = require('../controllers/cashbookController');
const router = express.Router();
router.use(requireAuth);

const W = requireRole('admin', 'treasurer');

// Module 6 — Cash Receipts & Disbursements Record
router.get('/crdr',        crdr.list);
router.post('/crdr',    W, crdr.create);
router.put('/crdr/:id', W, crdr.update);
router.delete('/crdr/:id', W, crdr.remove);

// Module 7 — Cash in Bank Register
router.get('/chbr',        chbr.list);
router.get('/chbr/banks',  chbr.banks);
router.post('/chbr',    W, chbr.create);
router.put('/chbr/:id', W, chbr.update);
router.delete('/chbr/:id', W, chbr.remove);

// Module 8 — Summary/Schedule of Checks Issued (derived report)
router.get('/checks-issued', checksIssued);

module.exports = router;
