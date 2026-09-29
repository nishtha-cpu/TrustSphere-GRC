const policyService = require('../services/policyService');

/**
 * Controller for Policy Management endpoints (with Authenticated Tenant Context support)
 */

function getEffectiveTenantId(req, bodyTenantId, queryTenantId) {
  if (req.user && req.user.tenantId) {
    return Number(req.user.tenantId);
  }
  const fallback = bodyTenantId || queryTenantId;
  return fallback ? Number(fallback) : null;
}

function checkTenantConflict(req, payloadTenantId) {
  if (req.user && req.user.tenantId && payloadTenantId !== undefined && payloadTenantId !== null) {
    if (Number(payloadTenantId) !== Number(req.user.tenantId)) {
      return true;
    }
  }
  return false;
}

async function createPolicy(req, res) {
  try {
    const {
      tenant_id,
      policy_code,
      title,
      description,
      policy_type,
      owner_id,
      status,
      review_date,
      effective_date,
      expiry_date
    } = req.body;

    if (checkTenantConflict(req, tenant_id)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const effectiveTenantId = getEffectiveTenantId(req, tenant_id);

    // 1. Required fields check
    if (!effectiveTenantId || !policy_code || !title || !policy_type || !owner_id) {
      return res.status(400).json({
        error: 'Missing required fields: tenant_id, policy_code, title, policy_type, owner_id'
      });
    }

    // 2. Validate policy_type
    if (!policyService.VALID_POLICY_TYPES.includes(policy_type)) {
      return res.status(400).json({
        error: `Invalid policy_type. Must be one of: ${policyService.VALID_POLICY_TYPES.join(', ')}`
      });
    }

    // 3. Validate status if supplied
    if (status && !policyService.VALID_POLICY_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${policyService.VALID_POLICY_STATUSES.join(', ')}`
      });
    }

    // 4. Verify tenant exists
    const tenantExists = await policyService.checkTenantExists(effectiveTenantId);
    if (!tenantExists) {
      return res.status(400).json({
        error: 'Invalid tenant_id: specified tenant does not exist'
      });
    }

    // 5. Verify owner exists and belongs to specified tenant
    const ownerValid = await policyService.checkUserInTenant(owner_id, effectiveTenantId);
    if (!ownerValid) {
      return res.status(400).json({
        error: 'Invalid owner_id: user does not exist or does not belong to specified tenant'
      });
    }

    const policy = await policyService.createPolicy({
      tenant_id: effectiveTenantId,
      policy_code,
      title,
      description,
      policy_type,
      owner_id,
      status,
      review_date,
      effective_date,
      expiry_date
    });

    return res.status(201).json({
      message: 'Policy created successfully',
      data: policy
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Policy code already exists for this tenant'
      });
    }
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error creating policy:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPolicies(req, res) {
  try {
    const { status, policy_type, owner_id, search } = req.query;
    const effectiveTenantId = getEffectiveTenantId(req, null, req.query.tenant_id);

    if (!effectiveTenantId) {
      return res.status(400).json({ error: 'tenant_id query parameter is required' });
    }

    const policies = await policyService.getPolicies({
      tenant_id: effectiveTenantId,
      status,
      policy_type,
      owner_id,
      search
    });

    return res.status(200).json({ data: policies });
  } catch (error) {
    console.error('Error fetching policies:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPolicyById(req, res) {
  try {
    const { id } = req.params;
    const effectiveTenantId = getEffectiveTenantId(req, null, req.query.tenant_id);

    if (!effectiveTenantId) {
      return res.status(400).json({ error: 'tenant_id query parameter is required' });
    }

    const policy = await policyService.getPolicyById(id, effectiveTenantId);
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    return res.status(200).json({ data: policy });
  } catch (error) {
    console.error('Error fetching policy by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updatePolicy(req, res) {
  try {
    const { id } = req.params;
    const bodyTenantId = req.body ? req.body.tenant_id : null;

    if (checkTenantConflict(req, bodyTenantId)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const effectiveTenantId = getEffectiveTenantId(req, bodyTenantId, req.query.tenant_id);

    if (!effectiveTenantId) {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    if (req.body.policy_type && !policyService.VALID_POLICY_TYPES.includes(req.body.policy_type)) {
      return res.status(400).json({
        error: `Invalid policy_type. Must be one of: ${policyService.VALID_POLICY_TYPES.join(', ')}`
      });
    }

    if (req.body.status && !policyService.VALID_POLICY_STATUSES.includes(req.body.status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${policyService.VALID_POLICY_STATUSES.join(', ')}`
      });
    }

    const updated = await policyService.updatePolicy(id, req.body, effectiveTenantId);
    return res.status(200).json({
      message: 'Policy updated successfully',
      data: updated
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error updating policy:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deletePolicy(req, res) {
  try {
    const { id } = req.params;
    const effectiveTenantId = getEffectiveTenantId(req, req.body ? req.body.tenant_id : null, req.query.tenant_id);

    if (!effectiveTenantId) {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    const success = await policyService.deletePolicy(id, effectiveTenantId);
    if (!success) {
      return res.status(404).json({ error: 'Policy not found or already deleted' });
    }

    return res.status(200).json({ message: 'Policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting policy:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createPolicyVersion(req, res) {
  try {
    const { policyId } = req.params;
    const {
      tenant_id,
      version_number,
      version_label,
      content,
      change_summary,
      created_by
    } = req.body;

    if (checkTenantConflict(req, tenant_id)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const effectiveTenantId = getEffectiveTenantId(req, tenant_id);

    if (!effectiveTenantId || !policyId || version_number === undefined || !content || !created_by) {
      return res.status(400).json({
        error: 'Missing required fields: tenant_id, version_number, content, created_by'
      });
    }

    if (typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({
        error: 'Content is required and must be a non-empty string'
      });
    }

    const version = await policyService.createPolicyVersion({
      tenant_id: effectiveTenantId,
      policy_id: policyId,
      version_number,
      version_label,
      content,
      change_summary,
      created_by
    });

    return res.status(201).json({
      message: 'Policy version created successfully',
      data: version
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Version number already exists for this policy'
      });
    }
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error creating policy version:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPolicyVersions(req, res) {
  try {
    const { policyId } = req.params;
    const effectiveTenantId = getEffectiveTenantId(req, null, req.query.tenant_id);

    if (!effectiveTenantId) {
      return res.status(400).json({ error: 'tenant_id query parameter is required' });
    }

    const versions = await policyService.getPolicyVersions(policyId, effectiveTenantId);
    return res.status(200).json({ data: versions });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error fetching policy versions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPolicyVersionById(req, res) {
  try {
    const { id } = req.params;
    const effectiveTenantId = getEffectiveTenantId(req, null, req.query.tenant_id);

    if (!effectiveTenantId) {
      return res.status(400).json({ error: 'tenant_id query parameter is required' });
    }

    const version = await policyService.getPolicyVersionById(id, effectiveTenantId);
    if (!version) {
      return res.status(404).json({ error: 'Policy version not found' });
    }

    return res.status(200).json({ data: version });
  } catch (error) {
    console.error('Error fetching policy version by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function reviewPolicyVersion(req, res) {
  try {
    const { id } = req.params;
    const { tenant_id, reviewer_id } = req.body;

    if (checkTenantConflict(req, tenant_id)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const effectiveTenantId = getEffectiveTenantId(req, tenant_id);

    if (!effectiveTenantId || !reviewer_id) {
      return res.status(400).json({ error: 'Missing required fields: tenant_id, reviewer_id' });
    }

    const version = await policyService.reviewPolicyVersion(id, reviewer_id, effectiveTenantId);
    return res.status(200).json({
      message: 'Policy version reviewed successfully',
      data: version
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error reviewing policy version:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function approvePolicyVersion(req, res) {
  try {
    const { id } = req.params;
    const { tenant_id, approver_id, set_as_current } = req.body;

    if (checkTenantConflict(req, tenant_id)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const effectiveTenantId = getEffectiveTenantId(req, tenant_id);

    if (!effectiveTenantId || !approver_id) {
      return res.status(400).json({ error: 'Missing required fields: tenant_id, approver_id' });
    }

    const version = await policyService.approvePolicyVersion(id, approver_id, effectiveTenantId, set_as_current !== false);
    return res.status(200).json({
      message: 'Policy version approved successfully',
      data: version
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error approving policy version:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  createPolicy,
  getPolicies,
  getPolicyById,
  updatePolicy,
  deletePolicy,
  createPolicyVersion,
  getPolicyVersions,
  getPolicyVersionById,
  reviewPolicyVersion,
  approvePolicyVersion
};
