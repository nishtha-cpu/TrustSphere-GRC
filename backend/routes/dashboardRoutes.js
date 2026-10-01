const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const ALLOWED_ROLES = ['SYSTEM_ADMIN', 'TENANT_ADMIN', 'RISK_MANAGER', 'AUDITOR', 'POLICY_MGR', 'SEC_OFFICER'];

router.use(authMiddleware);

router.get('/compliance-overview', requireRole(...ALLOWED_ROLES), dashboardController.getComplianceDashboard);

module.exports = router;
