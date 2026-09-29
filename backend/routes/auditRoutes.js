const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Mount authMiddleware on all Audit Management routes
router.use(authMiddleware);

// POST /api/audits - Create a new audit engagement
router.post('/', requireRole('AUDITOR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), auditController.createAudit);

// GET /api/audits - Get list of audits for authenticated tenant
router.get('/', requireRole('AUDITOR', 'RISK_MANAGER', 'POLICY_MGR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), auditController.getAudits);

// GET /api/audits/:id - Get audit by ID
router.get('/:id', requireRole('AUDITOR', 'RISK_MANAGER', 'POLICY_MGR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), auditController.getAuditById);

// PUT /api/audits/:id - Update an audit
router.put('/:id', requireRole('AUDITOR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), auditController.updateAudit);

// DELETE /api/audits/:id - Soft delete an audit (Destructive)
router.delete('/:id', requireRole('TENANT_ADMIN', 'SYSTEM_ADMIN'), auditController.deleteAudit);

module.exports = router;

