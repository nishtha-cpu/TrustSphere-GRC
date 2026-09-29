const express = require('express');
const router = express.Router();
const riskController = require('../controllers/riskController');
const riskAssessmentController = require('../controllers/riskAssessmentController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Mount authMiddleware on all Risk Register routes
router.use(authMiddleware);

// POST /api/risks - Create a risk
router.post('/', requireRole('RISK_MANAGER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), riskController.createRisk);

// GET /api/risks - Get all risks for authenticated tenant
router.get('/', requireRole('RISK_MANAGER', 'AUDITOR', 'POLICY_MGR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), riskController.getRisks);

// GET /api/risks/:riskId/assessments - Get all assessments for a risk
router.get('/:riskId/assessments', requireRole('RISK_MANAGER', 'AUDITOR', 'POLICY_MGR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), riskAssessmentController.getAssessmentsByRisk);

// GET /api/risks/:id - Get one risk by ID
router.get('/:id', requireRole('RISK_MANAGER', 'AUDITOR', 'POLICY_MGR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), riskController.getRiskById);

// PUT /api/risks/:id - Update a risk
router.put('/:id', requireRole('RISK_MANAGER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), riskController.updateRisk);

// DELETE /api/risks/:id - Soft-delete a risk (Destructive)
router.delete('/:id', requireRole('TENANT_ADMIN', 'SYSTEM_ADMIN'), riskController.deleteRisk);

module.exports = router;

