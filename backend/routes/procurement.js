const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { obr, pr, po, iar, ris, dv } = require('../controllers/procurementController');
const router = express.Router();
router.use(requireAuth);

const W = requireRole('admin', 'treasurer', 'secretary');
const D = requireRole('admin', 'treasurer');

// Module 10 — Obligation Request
router.get('/obr',        obr.list);
router.post('/obr',    W, obr.create);
router.put('/obr/:id', W, obr.update);
router.delete('/obr/:id', D, obr.remove);

// Module 11 — Purchase Request
router.get('/pr',        pr.list);
router.post('/pr',    W, pr.create);
router.put('/pr/:id', W, pr.update);
router.delete('/pr/:id', D, pr.remove);
router.post('/pr/:id/generate-po', W, pr.generatePO);

// Module 12 — Purchase Order
router.get('/po',        po.list);
router.put('/po/:id', W, po.update);
router.delete('/po/:id', D, po.remove);
router.post('/po/:id/generate-iar', W, po.generateIAR);

// Module 13 — Inspection & Acceptance Report
router.get('/iar',        iar.list);
router.put('/iar/:id', W, iar.update);
router.delete('/iar/:id', D, iar.remove);
router.post('/iar/:id/generate-ris', W, iar.generateRIS);
router.post('/iar/:id/generate-dv',  W, iar.generateDV);

// Module 14 — Requisition & Issue Slip
router.get('/ris',        ris.list);
router.put('/ris/:id', W, ris.update);
router.delete('/ris/:id', D, ris.remove);

// Module 15 — Disbursement Voucher
router.get('/dv',        dv.list);
router.put('/dv/:id', W, dv.update);
router.delete('/dv/:id', D, dv.remove);
router.post('/dv/:id/mark-paid', D, dv.markPaid);

module.exports = router;
