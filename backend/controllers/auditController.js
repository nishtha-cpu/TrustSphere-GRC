const auditService = require('../services/auditService');

/**
 * Controller for Audit Management endpoints (JWT Authenticated)
 */

async function createAudit(req, res) {
  try {
    const {
      tenant_id,
      audit_code,
      title,
      description,
      audit_type,
      lead_auditor_id,
      status,
      planned_start_date,
      planned_end_date,
      actual_start_date,
      actual_end_date,
      scope,
      objectives
    } = req.body;

    if (tenant_id !== undefined && tenant_id !== null && Number(tenant_id) !== Number(req.user.tenantId)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const tenantId = Number(req.user.tenantId);

    // 1. Required fields validation
    if (!audit_code || !title || !audit_type || !lead_auditor_id) {
      return res.status(400).json({
        error: 'Missing required fields: audit_code, title, audit_type, lead_auditor_id'
      });
    }

    // 2. Validate audit_type
    if (!auditService.VALID_AUDIT_TYPES.includes(audit_type)) {
      return res.status(400).json({
        error: `Invalid audit_type. Must be one of: ${auditService.VALID_AUDIT_TYPES.join(', ')}`
      });
    }

    // 3. Validate status if provided
    if (status && !auditService.VALID_AUDIT_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${auditService.VALID_AUDIT_STATUSES.join(', ')}`
      });
    }

    // 4. Multi-Tenant Validation: Lead Auditor belongs to authenticated tenant
    const userValid = await auditService.checkUserInTenant(lead_auditor_id, tenantId);
    if (!userValid) {
      return res.status(400).json({
        error: 'Invalid lead_auditor_id: user does not exist or does not belong to the specified tenant'
      });
    }

    // 5. Create audit
    const newAudit = await auditService.createAudit({
      tenant_id: tenantId,
      audit_code,
      title,
      description,
      audit_type,
      lead_auditor_id,
      status: status || 'PLANNED',
      planned_start_date,
      planned_end_date,
      actual_start_date,
      actual_end_date,
      scope,
      objectives
    });

    return res.status(201).json({
      message: 'Audit created successfully',
      data: newAudit
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Audit code already exists for this tenant'
      });
    }
    console.error('Error creating audit:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAudits(req, res) {
  try {
    const { status, audit_type } = req.query;
    const tenantId = Number(req.user.tenantId);

    if (status && !auditService.VALID_AUDIT_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status filter. Must be one of: ${auditService.VALID_AUDIT_STATUSES.join(', ')}`
      });
    }

    if (audit_type && !auditService.VALID_AUDIT_TYPES.includes(audit_type)) {
      return res.status(400).json({
        error: `Invalid audit_type filter. Must be one of: ${auditService.VALID_AUDIT_TYPES.join(', ')}`
      });
    }

    const audits = await auditService.getAuditsByTenant(tenantId, { status, audit_type });
    return res.status(200).json({ data: audits });
  } catch (error) {
    console.error('Error fetching audits:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAuditById(req, res) {
  try {
    const { id } = req.params;
    const tenantId = Number(req.user.tenantId);

    const audit = await auditService.getAuditById(id, tenantId);
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    return res.status(200).json({ data: audit });
  } catch (error) {
    console.error('Error fetching audit by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateAudit(req, res) {
  try {
    const { id } = req.params;
    const { tenant_id } = req.body;

    if (tenant_id !== undefined && tenant_id !== null && Number(tenant_id) !== Number(req.user.tenantId)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const tenantId = Number(req.user.tenantId);

    // Verify existing audit
    const existing = await auditService.getAuditById(id, tenantId);
    if (!existing) {
      return res.status(404).json({ error: 'Audit not found or deleted' });
    }

    // Validate enum fields if updated
    if (req.body.audit_type && !auditService.VALID_AUDIT_TYPES.includes(req.body.audit_type)) {
      return res.status(400).json({
        error: `Invalid audit_type. Must be one of: ${auditService.VALID_AUDIT_TYPES.join(', ')}`
      });
    }

    if (req.body.status && !auditService.VALID_AUDIT_STATUSES.includes(req.body.status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${auditService.VALID_AUDIT_STATUSES.join(', ')}`
      });
    }

    // Validate lead_auditor_id if updated
    if (req.body.lead_auditor_id) {
      const userValid = await auditService.checkUserInTenant(req.body.lead_auditor_id, tenantId);
      if (!userValid) {
        return res.status(400).json({
          error: 'Invalid lead_auditor_id: user does not exist or does not belong to the specified tenant'
        });
      }
    }

    const updatedAudit = await auditService.updateAudit(id, req.body, tenantId);
    return res.status(200).json({
      message: 'Audit updated successfully',
      data: updatedAudit
    });
  } catch (error) {
    console.error('Error updating audit:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteAudit(req, res) {
  try {
    const { id } = req.params;
    const tenantId = Number(req.user.tenantId);

    const success = await auditService.deleteAudit(id, tenantId);
    if (!success) {
      return res.status(404).json({ error: 'Audit not found or already deleted' });
    }

    return res.status(200).json({ message: 'Audit deleted successfully' });
  } catch (error) {
    console.error('Error deleting audit:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  createAudit,
  getAudits,
  getAuditById,
  updateAudit,
  deleteAudit
};
