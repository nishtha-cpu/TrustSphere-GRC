const express = require('express');
const router = express.Router();
const auditTeamController = require('../controllers/auditTeamController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Mount authMiddleware on all Audit Team routes
router.use(authMiddleware);

// POST /api/audits/:auditId/team - Assign user to audit team
router.post('/:auditId/team', requireRole('AUDITOR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), auditTeamController.assignTeamMember);

// GET /api/audits/:auditId/team - List assigned team members
router.get('/:auditId/team', requireRole('AUDITOR', 'RISK_MANAGER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), auditTeamController.getAuditTeam);

// PUT /api/audits/:auditId/team/:userId - Update team member role
router.put('/:auditId/team/:userId', requireRole('AUDITOR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), auditTeamController.updateTeamMemberRole);

// DELETE /api/audits/:auditId/team/:userId - Remove team member
router.delete('/:auditId/team/:userId', requireRole('AUDITOR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), auditTeamController.removeTeamMember);

module.exports = router;

