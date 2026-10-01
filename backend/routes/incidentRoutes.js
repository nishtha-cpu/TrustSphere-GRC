const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const ALLOWED_ROLES = ['SYSTEM_ADMIN', 'TENANT_ADMIN', 'RISK_MANAGER', 'AUDITOR', 'POLICY_MGR', 'SEC_OFFICER'];

router.use(authMiddleware);

router.get('/', requireRole(...ALLOWED_ROLES), incidentController.listIncidents);
router.post('/', requireRole('SYSTEM_ADMIN', 'TENANT_ADMIN', 'RISK_MANAGER', 'SEC_OFFICER'), incidentController.createIncident);
router.get('/:id', requireRole(...ALLOWED_ROLES), incidentController.getIncidentById);
router.put('/:id/status', requireRole('SYSTEM_ADMIN', 'TENANT_ADMIN', 'RISK_MANAGER', 'SEC_OFFICER'), incidentController.updateIncidentStatus);

module.exports = router;
