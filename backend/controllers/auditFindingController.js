const auditFindingService = require('../services/auditFindingService');

/**
 * Controller for Audit Findings endpoints (JWT Authenticated)
 */

async function createFinding(req, res) {
  try {
    const { auditId } = req.params;
    const {
      tenant_id,
      finding_code,
      title,
      description,
      severity,
      status,
      risk_id,
      identified_by,
      identified_date
    } = req.body;

    if (tenant_id !== undefined && tenant_id !== null && Number(tenant_id) !== Number(req.user.tenantId)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const tenantId = Number(req.user.tenantId);

    // 1. Required fields check
    if (!auditId || !finding_code || !title || !description || !severity || !identified_by || !identified_date) {
      return res.status(400).json({
        error: 'Missing required fields: finding_code, title, description, severity, identified_by, identified_date'
      });
    }

    // 2. Validate severity
    if (!auditFindingService.VALID_SEVERITIES.includes(severity)) {
      return res.status(400).json({
        error: `Invalid severity. Must be one of: ${auditFindingService.VALID_SEVERITIES.join(', ')}`
      });
    }

    // 3. Validate status if provided
    if (status && !auditFindingService.VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${auditFindingService.VALID_STATUSES.join(', ')}`
      });
    }

    // 4. Verify audit exists and belongs to authenticated tenant
    const auditValid = await auditFindingService.checkAuditForTenant(auditId, tenantId);
    if (!auditValid) {
      return res.status(404).json({
        error: 'Audit not found or does not belong to specified tenant'
      });
    }

    // 5. Verify identified_by user exists and belongs to authenticated tenant
    const userValid = await auditFindingService.checkUserForTenant(identified_by, tenantId);
    if (!userValid) {
      return res.status(400).json({
        error: 'Invalid identified_by: user does not exist or does not belong to specified tenant'
      });
    }

    // 6. If risk_id is provided, verify risk exists and belongs to authenticated tenant
    if (risk_id) {
      const riskValid = await auditFindingService.checkRiskForTenant(risk_id, tenantId);
      if (!riskValid) {
        return res.status(400).json({
          error: 'Invalid risk_id: risk does not exist or does not belong to specified tenant'
        });
      }
    }

    const finding = await auditFindingService.createFinding({
      tenant_id: tenantId,
      audit_id: auditId,
      finding_code,
      title,
      description,
      severity,
      status: status || 'DRAFT',
      risk_id,
      identified_by,
      identified_date
    });

    return res.status(201).json({
      message: 'Audit finding created successfully',
      data: finding
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Finding code already exists for this tenant'
      });
    }
    console.error('Error creating audit finding:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getFindingsByAudit(req, res) {
  try {
    const { auditId } = req.params;
    const { severity, status } = req.query;
    const tenantId = Number(req.user.tenantId);

    if (severity && !auditFindingService.VALID_SEVERITIES.includes(severity)) {
      return res.status(400).json({
        error: `Invalid severity filter. Must be one of: ${auditFindingService.VALID_SEVERITIES.join(', ')}`
      });
    }

    if (status && !auditFindingService.VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status filter. Must be one of: ${auditFindingService.VALID_STATUSES.join(', ')}`
      });
    }

    const auditValid = await auditFindingService.checkAuditForTenant(auditId, tenantId);
    if (!auditValid) {
      return res.status(404).json({
        error: 'Audit not found or does not belong to specified tenant'
      });
    }

    const findings = await auditFindingService.getFindingsByAudit(auditId, tenantId, { severity, status });
    return res.status(200).json({ data: findings });
  } catch (error) {
    console.error('Error fetching findings for audit:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getFindingById(req, res) {
  try {
    const { id } = req.params;
    const tenantId = Number(req.user.tenantId);

    const finding = await auditFindingService.getFindingById(id, tenantId);
    if (!finding) {
      return res.status(404).json({ error: 'Finding not found' });
    }

    return res.status(200).json({ data: finding });
  } catch (error) {
    console.error('Error fetching finding by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateFinding(req, res) {
  try {
    const { id } = req.params;
    const { tenant_id } = req.body;

    if (tenant_id !== undefined && tenant_id !== null && Number(tenant_id) !== Number(req.user.tenantId)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const tenantId = Number(req.user.tenantId);

    const existing = await auditFindingService.getFindingById(id, tenantId);
    if (!existing) {
      return res.status(404).json({ error: 'Finding not found or deleted' });
    }

    if (req.body.severity && !auditFindingService.VALID_SEVERITIES.includes(req.body.severity)) {
      return res.status(400).json({
        error: `Invalid severity. Must be one of: ${auditFindingService.VALID_SEVERITIES.join(', ')}`
      });
    }

    if (req.body.status && !auditFindingService.VALID_STATUSES.includes(req.body.status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${auditFindingService.VALID_STATUSES.join(', ')}`
      });
    }

    if (req.body.risk_id) {
      const riskValid = await auditFindingService.checkRiskForTenant(req.body.risk_id, tenantId);
      if (!riskValid) {
        return res.status(400).json({
          error: 'Invalid risk_id: risk does not exist or does not belong to specified tenant'
        });
      }
    }

    const updated = await auditFindingService.updateFinding(id, req.body, tenantId);
    return res.status(200).json({
      message: 'Audit finding updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error updating finding:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteFinding(req, res) {
  try {
    const { id } = req.params;
    const tenantId = Number(req.user.tenantId);

    const success = await auditFindingService.deleteFinding(id, tenantId);
    if (!success) {
      return res.status(404).json({ error: 'Finding not found or already deleted' });
    }

    return res.status(200).json({ message: 'Audit finding deleted successfully' });
  } catch (error) {
    console.error('Error deleting finding:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  createFinding,
  getFindingsByAudit,
  getFindingById,
  updateFinding,
  deleteFinding
};
