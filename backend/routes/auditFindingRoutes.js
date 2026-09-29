const express = require('express');
const router = express.Router();
const auditFindingController = require('../controllers/auditFindingController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Mount authMiddleware on all Audit Finding routes
router.use(authMiddleware);

// POST /api/audits/:auditId/findings - Create a new finding for an audit
router.post('/audits/:auditId/findings', requireRole('AUDITOR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), auditFindingController.createFinding);

// GET /api/audits/:auditId/findings - Get list of findings for an audit
router.get('/audits/:auditId/findings', requireRole('AUDITOR', 'RISK_MANAGER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), auditFindingController.getFindingsByAudit);

// GET /api/findings/:id - Get single finding by ID
router.get('/findings/:id', requireRole('AUDITOR', 'RISK_MANAGER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), auditFindingController.getFindingById);

// PUT /api/findings/:id - Update finding
router.put('/findings/:id', requireRole('AUDITOR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), auditFindingController.updateFinding);

// DELETE /api/findings/:id - Soft delete finding (Destructive)
router.delete('/findings/:id', requireRole('TENANT_ADMIN', 'SYSTEM_ADMIN'), auditFindingController.deleteFinding);

module.exports = router;

