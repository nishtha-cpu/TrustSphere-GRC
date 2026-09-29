const evidenceService = require('../services/evidenceService');

/**
 * Controller for Audit Evidence metadata endpoints (JWT Authenticated)
 */

function validateMetadata(body) {
  const { file_name, file_key, file_size_bytes, mime_type, uploaded_by } = body;

  if (!file_name || !file_key || file_size_bytes === undefined || file_size_bytes === null || !mime_type || !uploaded_by) {
    return 'Missing required fields: file_name, file_key, file_size_bytes, mime_type, uploaded_by';
  }

  if (typeof file_name !== 'string' || file_name.trim() === '') {
    return 'Invalid file_name: must be a non-empty string';
  }

  if (typeof file_key !== 'string' || file_key.trim() === '') {
    return 'Invalid file_key: must be a non-empty string';
  }

  if (typeof mime_type !== 'string' || mime_type.trim() === '') {
    return 'Invalid mime_type: must be a non-empty string';
  }

  const numBytes = Number(file_size_bytes);
  if (isNaN(numBytes) || numBytes < 0) {
    return 'Invalid file_size_bytes: must be a non-negative number';
  }

  return null;
}

function checkTenantConflict(req, bodyTenantId) {
  if (bodyTenantId !== undefined && bodyTenantId !== null && Number(bodyTenantId) !== Number(req.user.tenantId)) {
    return true;
  }
  return false;
}

async function createAuditEvidence(req, res) {
  try {
    const { auditId } = req.params;
    const { tenant_id, file_name, file_key, file_size_bytes, mime_type, uploaded_by } = req.body;

    if (checkTenantConflict(req, tenant_id)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const tenantId = Number(req.user.tenantId);

    const validationError = validateMetadata(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const auditValid = await evidenceService.checkAuditForTenant(auditId, tenantId);
    if (!auditValid) {
      return res.status(404).json({ error: 'Audit not found or does not belong to specified tenant' });
    }

    const userValid = await evidenceService.checkUserForTenant(uploaded_by, tenantId);
    if (!userValid) {
      return res.status(400).json({ error: 'Invalid uploaded_by: user does not exist or does not belong to specified tenant' });
    }

    const evidence = await evidenceService.createEvidence({
      tenant_id: tenantId,
      audit_id: auditId,
      file_name,
      file_key,
      file_size_bytes: Number(file_size_bytes),
      mime_type,
      uploaded_by
    });

    return res.status(201).json({
      message: 'Evidence created successfully',
      data: evidence
    });
  } catch (error) {
    console.error('Error creating audit evidence:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAuditEvidence(req, res) {
  try {
    const { auditId } = req.params;
    const tenantId = Number(req.user.tenantId);

    const auditValid = await evidenceService.checkAuditForTenant(auditId, tenantId);
    if (!auditValid) {
      return res.status(404).json({ error: 'Audit not found or does not belong to specified tenant' });
    }

    const evidenceList = await evidenceService.getEvidenceByAudit(auditId, tenantId);
    return res.status(200).json({ data: evidenceList });
  } catch (error) {
    console.error('Error fetching audit evidence:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createFindingEvidence(req, res) {
  try {
    const { findingId } = req.params;
    const { tenant_id, file_name, file_key, file_size_bytes, mime_type, uploaded_by } = req.body;

    if (checkTenantConflict(req, tenant_id)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const tenantId = Number(req.user.tenantId);

    const validationError = validateMetadata(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const findingValid = await evidenceService.checkFindingForTenant(findingId, tenantId);
    if (!findingValid) {
      return res.status(404).json({ error: 'Finding not found or does not belong to specified tenant' });
    }

    const userValid = await evidenceService.checkUserForTenant(uploaded_by, tenantId);
    if (!userValid) {
      return res.status(400).json({ error: 'Invalid uploaded_by: user does not exist or does not belong to specified tenant' });
    }

    const evidence = await evidenceService.createEvidence({
      tenant_id: tenantId,
      finding_id: findingId,
      file_name,
      file_key,
      file_size_bytes: Number(file_size_bytes),
      mime_type,
      uploaded_by
    });

    return res.status(201).json({
      message: 'Evidence created successfully',
      data: evidence
    });
  } catch (error) {
    console.error('Error creating finding evidence:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getFindingEvidence(req, res) {
  try {
    const { findingId } = req.params;
    const tenantId = Number(req.user.tenantId);

    const findingValid = await evidenceService.checkFindingForTenant(findingId, tenantId);
    if (!findingValid) {
      return res.status(404).json({ error: 'Finding not found or does not belong to specified tenant' });
    }

    const evidenceList = await evidenceService.getEvidenceByFinding(findingId, tenantId);
    return res.status(200).json({ data: evidenceList });
  } catch (error) {
    console.error('Error fetching finding evidence:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createCapaEvidence(req, res) {
  try {
    const { capaId } = req.params;
    const { tenant_id, file_name, file_key, file_size_bytes, mime_type, uploaded_by } = req.body;

    if (checkTenantConflict(req, tenant_id)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const tenantId = Number(req.user.tenantId);

    const validationError = validateMetadata(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const capaValid = await evidenceService.checkCapaForTenant(capaId, tenantId);
    if (!capaValid) {
      return res.status(404).json({ error: 'CAPA not found or does not belong to specified tenant' });
    }

    const userValid = await evidenceService.checkUserForTenant(uploaded_by, tenantId);
    if (!userValid) {
      return res.status(400).json({ error: 'Invalid uploaded_by: user does not exist or does not belong to specified tenant' });
    }

    const evidence = await evidenceService.createEvidence({
      tenant_id: tenantId,
      capa_id: capaId,
      file_name,
      file_key,
      file_size_bytes: Number(file_size_bytes),
      mime_type,
      uploaded_by
    });

    return res.status(201).json({
      message: 'Evidence created successfully',
      data: evidence
    });
  } catch (error) {
    console.error('Error creating CAPA evidence:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getCapaEvidence(req, res) {
  try {
    const { capaId } = req.params;
    const tenantId = Number(req.user.tenantId);

    const capaValid = await evidenceService.checkCapaForTenant(capaId, tenantId);
    if (!capaValid) {
      return res.status(404).json({ error: 'CAPA not found or does not belong to specified tenant' });
    }

    const evidenceList = await evidenceService.getEvidenceByCapa(capaId, tenantId);
    return res.status(200).json({ data: evidenceList });
  } catch (error) {
    console.error('Error fetching CAPA evidence:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getEvidenceById(req, res) {
  try {
    const { id } = req.params;
    const tenantId = Number(req.user.tenantId);

    const evidence = await evidenceService.getEvidenceById(id, tenantId);
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    return res.status(200).json({ data: evidence });
  } catch (error) {
    console.error('Error fetching evidence by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteEvidence(req, res) {
  try {
    const { id } = req.params;
    const tenantId = Number(req.user.tenantId);

    const success = await evidenceService.deleteEvidence(id, tenantId);
    if (!success) {
      return res.status(404).json({ error: 'Evidence not found or already deleted' });
    }

    return res.status(200).json({ message: 'Evidence deleted successfully' });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  createAuditEvidence,
  getAuditEvidence,
  createFindingEvidence,
  getFindingEvidence,
  createCapaEvidence,
  getCapaEvidence,
  getEvidenceById,
  deleteEvidence
};
