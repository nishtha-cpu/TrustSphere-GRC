const express = require('express');
const router = express.Router();
const dataInventoryController = require('../controllers/dataInventoryController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const ALLOWED_ROLES = ['SYSTEM_ADMIN', 'TENANT_ADMIN', 'RISK_MANAGER', 'AUDITOR', 'POLICY_MGR', 'SEC_OFFICER'];

router.use(authMiddleware);

router.get('/assets', requireRole(...ALLOWED_ROLES), dataInventoryController.listDataAssets);
router.post('/assets', requireRole('SYSTEM_ADMIN', 'TENANT_ADMIN', 'RISK_MANAGER', 'SEC_OFFICER'), dataInventoryController.addDataAsset);
router.get('/flows', requireRole(...ALLOWED_ROLES), dataInventoryController.listDataFlows);
router.post('/flows', requireRole('SYSTEM_ADMIN', 'TENANT_ADMIN', 'RISK_MANAGER', 'SEC_OFFICER'), dataInventoryController.addDataFlow);

module.exports = router;
