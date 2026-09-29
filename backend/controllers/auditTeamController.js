const auditTeamService = require('../services/auditTeamService');

/**
 * Controller for Audit Team Assignment endpoints (JWT Authenticated)
 */

async function assignTeamMember(req, res) {
  try {
    const { auditId } = req.params;
    const { tenant_id, user_id, role_in_audit } = req.body;

    if (tenant_id !== undefined && tenant_id !== null && Number(tenant_id) !== Number(req.user.tenantId)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const tenantId = Number(req.user.tenantId);

    if (!user_id || !role_in_audit) {
      return res.status(400).json({
        error: 'Missing required fields: user_id, role_in_audit'
      });
    }

    if (!auditTeamService.VALID_AUDIT_ROLES.includes(role_in_audit)) {
      return res.status(400).json({
        error: `Invalid role_in_audit. Must be one of: ${auditTeamService.VALID_AUDIT_ROLES.join(', ')}`
      });
    }

    const assignment = await auditTeamService.assignTeamMember(auditId, user_id, role_in_audit, tenantId);
    return res.status(201).json({
      message: 'Team member assigned successfully',
      data: assignment
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error assigning team member:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAuditTeam(req, res) {
  try {
    const { auditId } = req.params;
    const tenantId = Number(req.user.tenantId);

    const team = await auditTeamService.getAuditTeam(auditId, tenantId);
    return res.status(200).json({ data: team });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error fetching audit team:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateTeamMemberRole(req, res) {
  try {
    const { auditId, userId } = req.params;
    const { tenant_id, role_in_audit } = req.body;

    if (tenant_id !== undefined && tenant_id !== null && Number(tenant_id) !== Number(req.user.tenantId)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const tenantId = Number(req.user.tenantId);

    if (!role_in_audit || !auditTeamService.VALID_AUDIT_ROLES.includes(role_in_audit)) {
      return res.status(400).json({
        error: `Invalid role_in_audit. Must be one of: ${auditTeamService.VALID_AUDIT_ROLES.join(', ')}`
      });
    }

    const updated = await auditTeamService.updateTeamMemberRole(auditId, userId, role_in_audit, tenantId);
    return res.status(200).json({
      message: 'Team member role updated successfully',
      data: updated
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error updating team member role:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function removeTeamMember(req, res) {
  try {
    const { auditId, userId } = req.params;
    const tenantId = Number(req.user.tenantId);

    await auditTeamService.removeTeamMember(auditId, userId, tenantId);
    return res.status(200).json({ message: 'Team member removed from audit successfully' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error removing team member:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  assignTeamMember,
  getAuditTeam,
  updateTeamMemberRole,
  removeTeamMember
};
