const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Mount authMiddleware on all Policy routes
router.use(authMiddleware);

// Policy CRUD Routes (mounted at /api/policies)
router.post('/', requireRole('POLICY_MGR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), policyController.createPolicy);
router.get('/', requireRole('POLICY_MGR', 'RISK_MANAGER', 'AUDITOR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), policyController.getPolicies);

// Policy Version Routes under Policy Scope (mounted at /api/policies/:policyId/versions)
router.post('/:policyId/versions', requireRole('POLICY_MGR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), policyController.createPolicyVersion);
router.get('/:policyId/versions', requireRole('POLICY_MGR', 'RISK_MANAGER', 'AUDITOR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), policyController.getPolicyVersions);

// Single Policy Details / Update / Delete Routes (must be after nested routes)
router.get('/:id', requireRole('POLICY_MGR', 'RISK_MANAGER', 'AUDITOR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), policyController.getPolicyById);
router.put('/:id', requireRole('POLICY_MGR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), policyController.updatePolicy);
router.delete('/:id', requireRole('TENANT_ADMIN', 'SYSTEM_ADMIN'), policyController.deletePolicy);

module.exports = router;

