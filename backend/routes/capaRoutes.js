const express = require('express');
const router = express.Router();
const capaController = require('../controllers/capaController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Mount authMiddleware on all CAPA routes
router.use(authMiddleware);

// POST /api/findings/:findingId/capa - Create a CAPA for a finding
router.post('/findings/:findingId/capa', requireRole('AUDITOR', 'RISK_MANAGER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), capaController.createCapa);

// GET /api/findings/:findingId/capa - List CAPAs for a finding
router.get('/findings/:findingId/capa', requireRole('AUDITOR', 'RISK_MANAGER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), capaController.getCapasByFinding);

// GET /api/capa/:id - Get single CAPA by ID
router.get('/capa/:id', requireRole('AUDITOR', 'RISK_MANAGER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), capaController.getCapaById);

// PUT /api/capa/:id - Update CAPA
router.put('/capa/:id', requireRole('AUDITOR', 'RISK_MANAGER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), capaController.updateCapa);

// DELETE /api/capa/:id - Soft delete CAPA (Destructive)
router.delete('/capa/:id', requireRole('TENANT_ADMIN', 'SYSTEM_ADMIN'), capaController.deleteCapa);

module.exports = router;

