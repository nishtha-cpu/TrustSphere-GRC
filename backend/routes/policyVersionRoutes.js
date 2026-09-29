const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Mount authMiddleware on all standalone Policy Version routes
router.use(authMiddleware);

// Standalone Policy Version Routes (mounted at /api/policy-versions)

// GET /api/policy-versions/:id - Get single policy version by ID
router.get('/:id', requireRole('POLICY_MGR', 'RISK_MANAGER', 'AUDITOR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), policyController.getPolicyVersionById);

// PUT /api/policy-versions/:id/review - Review policy version
router.put('/:id/review', requireRole('POLICY_MGR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), policyController.reviewPolicyVersion);

// PUT /api/policy-versions/:id/approve - Approve policy version
router.put('/:id/approve', requireRole('POLICY_MGR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), policyController.approvePolicyVersion);

module.exports = router;

