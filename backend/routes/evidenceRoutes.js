const express = require('express');
const router = express.Router();
const evidenceController = require('../controllers/evidenceController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Mount authMiddleware on all Evidence routes
router.use(authMiddleware);

// Audit Evidence Endpoints
router.post('/audits/:auditId/evidence', requireRole('AUDITOR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), evidenceController.createAuditEvidence);
router.get('/audits/:auditId/evidence', requireRole('AUDITOR', 'RISK_MANAGER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), evidenceController.getAuditEvidence);

// Finding Evidence Endpoints
router.post('/findings/:findingId/evidence', requireRole('AUDITOR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), evidenceController.createFindingEvidence);
router.get('/findings/:findingId/evidence', requireRole('AUDITOR', 'RISK_MANAGER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), evidenceController.getFindingEvidence);

// CAPA Evidence Endpoints
router.post('/capa/:capaId/evidence', requireRole('AUDITOR', 'RISK_MANAGER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), evidenceController.createCapaEvidence);
router.get('/capa/:capaId/evidence', requireRole('AUDITOR', 'RISK_MANAGER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), evidenceController.getCapaEvidence);

// Single Evidence Endpoints
router.get('/evidence/:id', requireRole('AUDITOR', 'RISK_MANAGER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), evidenceController.getEvidenceById);
router.delete('/evidence/:id', requireRole('AUDITOR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), evidenceController.deleteEvidence);

module.exports = router;

