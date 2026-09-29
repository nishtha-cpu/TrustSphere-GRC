const capaService = require('../services/capaService');

/**
 * Controller for Audit CAPA / Corrective Actions endpoints (JWT Authenticated)
 */

async function createCapa(req, res) {
  try {
    const { findingId } = req.params;
    const {
      tenant_id,
      capa_code,
      action_plan,
      owner_id,
      due_date,
      completion_date,
      status,
      verification_notes,
      verified_by,
      verified_at
    } = req.body;

    if (tenant_id !== undefined && tenant_id !== null && Number(tenant_id) !== Number(req.user.tenantId)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const tenantId = Number(req.user.tenantId);

    // 1. Required fields check
    if (!findingId || !capa_code || !action_plan || !owner_id || !due_date) {
      return res.status(400).json({
        error: 'Missing required fields: capa_code, action_plan, owner_id, due_date'
      });
    }

    // 2. Validate status if provided
    const capaStatus = status || 'ASSIGNED';
    if (!capaService.VALID_CAPA_STATUSES.includes(capaStatus)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${capaService.VALID_CAPA_STATUSES.join(', ')}`
      });
    }

    // 3. Verify finding exists and belongs to authenticated tenant
    const findingValid = await capaService.checkFindingForTenant(findingId, tenantId);
    if (!findingValid) {
      return res.status(404).json({
        error: 'Finding not found or does not belong to specified tenant'
      });
    }

    // 4. Verify owner exists and belongs to authenticated tenant
    const ownerValid = await capaService.checkUserForTenant(owner_id, tenantId);
    if (!ownerValid) {
      return res.status(400).json({
        error: 'Invalid owner_id: user does not exist or does not belong to specified tenant'
      });
    }

    // 5. Verify verifier if supplied
    if (verified_by) {
      const verifierValid = await capaService.checkUserForTenant(verified_by, tenantId);
      if (!verifierValid) {
        return res.status(400).json({
          error: 'Invalid verified_by: user does not exist or does not belong to specified tenant'
        });
      }
    }

    // 6. Verification Business Rules
    if (capaStatus === 'VERIFIED') {
      if (!verified_by || !verified_at) {
        return res.status(400).json({
          error: 'When status is VERIFIED, verified_by and verified_at must be supplied'
        });
      }
    }

    if (capaStatus === 'CLOSED') {
      if (!completion_date || !verified_by || !verified_at) {
        return res.status(400).json({
          error: 'When status is CLOSED, completion_date and verification details (verified_by, verified_at) must be supplied'
        });
      }
    }

    const capa = await capaService.createCapa({
      tenant_id: tenantId,
      finding_id: findingId,
      capa_code,
      action_plan,
      owner_id,
      due_date,
      completion_date,
      status: capaStatus,
      verification_notes,
      verified_by,
      verified_at
    });

    return res.status(201).json({
      message: 'CAPA created successfully',
      data: capa
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'CAPA code already exists for this tenant'
      });
    }
    console.error('Error creating CAPA:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getCapasByFinding(req, res) {
  try {
    const { findingId } = req.params;
    const tenantId = Number(req.user.tenantId);

    const findingValid = await capaService.checkFindingForTenant(findingId, tenantId);
    if (!findingValid) {
      return res.status(404).json({
        error: 'Finding not found or does not belong to specified tenant'
      });
    }

    const capas = await capaService.getCapasByFinding(findingId, tenantId);
    return res.status(200).json({ data: capas });
  } catch (error) {
    console.error('Error fetching CAPAs for finding:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getCapaById(req, res) {
  try {
    const { id } = req.params;
    const tenantId = Number(req.user.tenantId);

    const capa = await capaService.getCapaById(id, tenantId);
    if (!capa) {
      return res.status(404).json({ error: 'CAPA not found' });
    }

    return res.status(200).json({ data: capa });
  } catch (error) {
    console.error('Error fetching CAPA by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateCapa(req, res) {
  try {
    const { id } = req.params;
    const { tenant_id } = req.body;

    if (tenant_id !== undefined && tenant_id !== null && Number(tenant_id) !== Number(req.user.tenantId)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const tenantId = Number(req.user.tenantId);

    const existing = await capaService.getCapaById(id, tenantId);
    if (!existing) {
      return res.status(404).json({ error: 'CAPA not found or deleted' });
    }

    if (req.body.status && !capaService.VALID_CAPA_STATUSES.includes(req.body.status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${capaService.VALID_CAPA_STATUSES.join(', ')}`
      });
    }

    if (req.body.owner_id) {
      const ownerValid = await capaService.checkUserForTenant(req.body.owner_id, tenantId);
      if (!ownerValid) {
        return res.status(400).json({
          error: 'Invalid owner_id: user does not exist or does not belong to specified tenant'
        });
      }
    }

    if (req.body.verified_by) {
      const verifierValid = await capaService.checkUserForTenant(req.body.verified_by, tenantId);
      if (!verifierValid) {
        return res.status(400).json({
          error: 'Invalid verified_by: user does not exist or does not belong to specified tenant'
        });
      }
    }

    // Effective values after update
    const targetStatus = req.body.status !== undefined ? req.body.status : existing.status;
    const targetVerifiedBy = req.body.verified_by !== undefined ? req.body.verified_by : existing.verified_by;
    const targetVerifiedAt = req.body.verified_at !== undefined ? req.body.verified_at : existing.verified_at;
    const targetCompletionDate = req.body.completion_date !== undefined ? req.body.completion_date : existing.completion_date;

    // Verification Business Rules
    if (targetStatus === 'VERIFIED') {
      if (!targetVerifiedBy || !targetVerifiedAt) {
        return res.status(400).json({
          error: 'When status is VERIFIED, verified_by and verified_at must be supplied'
        });
      }
    }

    if (targetStatus === 'CLOSED') {
      if (!targetCompletionDate || !targetVerifiedBy || !targetVerifiedAt) {
        return res.status(400).json({
          error: 'When status is CLOSED, completion_date and verification details (verified_by, verified_at) must be supplied'
        });
      }
    }

    const updated = await capaService.updateCapa(id, req.body, tenantId);
    return res.status(200).json({
      message: 'CAPA updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error updating CAPA:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteCapa(req, res) {
  try {
    const { id } = req.params;
    const tenantId = Number(req.user.tenantId);

    const success = await capaService.deleteCapa(id, tenantId);
    if (!success) {
      return res.status(404).json({ error: 'CAPA not found or already deleted' });
    }

    return res.status(200).json({ message: 'CAPA deleted successfully' });
  } catch (error) {
    console.error('Error deleting CAPA:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  createCapa,
  getCapasByFinding,
  getCapaById,
  updateCapa,
  deleteCapa
};
