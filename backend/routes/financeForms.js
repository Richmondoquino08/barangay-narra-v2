const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { brgyId, kidlat, trip, pcf, sppcv, stats } = require('../controllers/financeFormsController');
const router = express.Router();
router.use(requireAuth);

const W = requireRole('admin', 'treasurer', 'secretary'); // write access

// Dashboard stats
router.get('/stats', stats);

// Module 1 — Barangay ID
router.get('/brgy-id',        brgyId.list);
router.post('/brgy-id',    W, brgyId.create);
router.put('/brgy-id/:id', W, brgyId.update);
router.delete('/brgy-id/:id', requireRole('admin','treasurer'), brgyId.remove);

// Module 2 — KIDLAT
router.get('/kidlat',        kidlat.list);
router.post('/kidlat',    W, kidlat.create);
router.put('/kidlat/:id', W, kidlat.update);
router.delete('/kidlat/:id', requireRole('admin','treasurer'), kidlat.remove);

// Module 3 — Trip Ticket
router.get('/trip',        trip.list);
router.post('/trip',    W, trip.create);
router.put('/trip/:id', W, trip.update);
router.delete('/trip/:id', requireRole('admin','treasurer'), trip.remove);

// Module 4 — Petty Cash Fund
router.get('/pcf',        pcf.list);
router.post('/pcf',    W, pcf.create);
router.put('/pcf/:id', W, pcf.update);
router.delete('/pcf/:id', requireRole('admin','treasurer'), pcf.remove);

// Module 5 — SPPCV (Petty Cash Vouchers)
router.get('/sppcv',        sppcv.list);
router.post('/sppcv',    W, sppcv.create);
router.put('/sppcv/:id', W, sppcv.update);
router.delete('/sppcv/:id', requireRole('admin','treasurer'), sppcv.remove);

module.exports = router;
