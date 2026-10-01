const express = require('express');
const router = express.Router();
const tprmController = require('../controllers/tprmController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const ALLOWED_ROLES = ['SYSTEM_ADMIN', 'TENANT_ADMIN', 'RISK_MANAGER', 'AUDITOR', 'POLICY_MGR', 'SEC_OFFICER'];

router.use(authMiddleware);

router.get('/vendors', requireRole(...ALLOWED_ROLES), tprmController.listVendors);
router.post('/vendors', requireRole('SYSTEM_ADMIN', 'TENANT_ADMIN', 'RISK_MANAGER', 'SEC_OFFICER'), tprmController.createVendor);
router.get('/vendors/:id', requireRole(...ALLOWED_ROLES), tprmController.getVendorById);
router.post('/vendors/:vendorId/assessments', requireRole('SYSTEM_ADMIN', 'TENANT_ADMIN', 'RISK_MANAGER', 'SEC_OFFICER'), tprmController.createTPRMAssessment);
router.post('/vendors/:vendorId/findings', requireRole('SYSTEM_ADMIN', 'TENANT_ADMIN', 'RISK_MANAGER', 'SEC_OFFICER'), tprmController.addTPRMFinding);

module.exports = router;
