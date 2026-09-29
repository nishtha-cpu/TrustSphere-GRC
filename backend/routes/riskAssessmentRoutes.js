const express = require('express');
const router = express.Router();
const riskAssessmentController = require('../controllers/riskAssessmentController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Mount authMiddleware on all Risk Assessment routes
router.use(authMiddleware);

// GET /api/risk-assessments/matrix - Get matrix heatmap data for authenticated tenant
router.get('/matrix', requireRole('RISK_MANAGER', 'AUDITOR', 'POLICY_MGR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), riskAssessmentController.getMatrixData);

// POST /api/risk-assessments - Create a risk assessment
router.post('/', requireRole('RISK_MANAGER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), riskAssessmentController.createAssessment);

// GET /api/risk-assessments/:id - Get one risk assessment by ID
router.get('/:id', requireRole('RISK_MANAGER', 'AUDITOR', 'POLICY_MGR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), riskAssessmentController.getAssessmentById);

module.exports = router;

