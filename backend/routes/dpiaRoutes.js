const express = require('express');
const router = express.Router();
const dpiaController = require('../controllers/dpiaController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const ALLOWED_ROLES = ['SYSTEM_ADMIN', 'TENANT_ADMIN', 'RISK_MANAGER', 'AUDITOR', 'POLICY_MGR', 'SEC_OFFICER'];

router.use(authMiddleware);

router.get('/', requireRole(...ALLOWED_ROLES), dpiaController.listDPIAs);
router.post('/', requireRole('SYSTEM_ADMIN', 'TENANT_ADMIN', 'RISK_MANAGER', 'POLICY_MGR'), dpiaController.createDPIA);
router.get('/:id', requireRole(...ALLOWED_ROLES), dpiaController.getDPIAById);
router.put('/:id/status', requireRole('SYSTEM_ADMIN', 'TENANT_ADMIN', 'RISK_MANAGER'), dpiaController.updateDPIAStatus);
router.post('/:id/remediations', requireRole('SYSTEM_ADMIN', 'TENANT_ADMIN', 'RISK_MANAGER'), dpiaController.addDPIARemediation);

module.exports = router;
