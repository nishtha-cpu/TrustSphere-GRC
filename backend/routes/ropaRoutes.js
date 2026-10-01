const express = require('express');
const router = express.Router();
const ropaController = require('../controllers/ropaController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const ALLOWED_ROLES = ['SYSTEM_ADMIN', 'TENANT_ADMIN', 'RISK_MANAGER', 'AUDITOR', 'POLICY_MGR', 'SEC_OFFICER'];

router.use(authMiddleware);

router.get('/', requireRole(...ALLOWED_ROLES), ropaController.listRoPARecords);
router.post('/', requireRole('SYSTEM_ADMIN', 'TENANT_ADMIN', 'POLICY_MGR', 'RISK_MANAGER'), ropaController.createRoPARecord);
router.get('/:id', requireRole(...ALLOWED_ROLES), ropaController.getRoPAById);
router.put('/:id', requireRole('SYSTEM_ADMIN', 'TENANT_ADMIN', 'POLICY_MGR', 'RISK_MANAGER'), ropaController.updateRoPARecord);
router.delete('/:id', requireRole('SYSTEM_ADMIN', 'TENANT_ADMIN'), ropaController.archiveRoPARecord);

module.exports = router;
