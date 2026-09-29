const riskService = require('../services/riskService');

/**
 * Controller for Risk Register endpoints (JWT Authenticated)
 */

async function createRisk(req, res) {
  try {
    const { tenant_id, risk_code, title, description, category_id, owner_id, status } = req.body;

    if (tenant_id !== undefined && tenant_id !== null && Number(tenant_id) !== Number(req.user.tenantId)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const tenantId = Number(req.user.tenantId);

    // Validate required fields
    if (!risk_code || !title || !description || !category_id || !owner_id) {
      return res.status(400).json({
        error: 'Missing required fields: risk_code, title, description, category_id, owner_id'
      });
    }

    const createdRisk = await riskService.createRisk({
      tenant_id: tenantId,
      risk_code,
      title,
      description,
      category_id,
      owner_id,
      status
    });

    return res.status(201).json({
      message: 'Risk created successfully',
      data: createdRisk
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Risk code already exists for this tenant' });
    }
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error creating risk:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getRisks(req, res) {
  try {
    const tenantId = Number(req.user.tenantId);
    const risks = await riskService.getRisksByTenant(tenantId);
    return res.status(200).json({ data: risks });
  } catch (error) {
    console.error('Error fetching risks:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getRiskById(req, res) {
  try {
    const { id } = req.params;
    const tenantId = Number(req.user.tenantId);

    const risk = await riskService.getRiskById(id, tenantId);
    if (!risk) {
      return res.status(404).json({ error: 'Risk not found' });
    }

    return res.status(200).json({ data: risk });
  } catch (error) {
    console.error('Error fetching risk by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateRisk(req, res) {
  try {
    const { id } = req.params;
    const { tenant_id } = req.body;

    if (tenant_id !== undefined && tenant_id !== null && Number(tenant_id) !== Number(req.user.tenantId)) {
      return res.status(400).json({ error: 'Tenant ID in request body conflicts with authenticated tenant' });
    }

    const tenantId = Number(req.user.tenantId);

    const updatedRisk = await riskService.updateRisk(id, { ...req.body, tenant_id: tenantId });
    if (!updatedRisk) {
      return res.status(404).json({ error: 'Risk not found or deleted' });
    }

    return res.status(200).json({
      message: 'Risk updated successfully',
      data: updatedRisk
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error updating risk:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteRisk(req, res) {
  try {
    const { id } = req.params;
    const tenantId = Number(req.user.tenantId);

    const success = await riskService.deleteRisk(id, tenantId);
    if (!success) {
      return res.status(404).json({ error: 'Risk not found or already deleted' });
    }

    return res.status(200).json({ message: 'Risk deleted successfully' });
  } catch (error) {
    console.error('Error deleting risk:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  createRisk,
  getRisks,
  getRiskById,
  updateRisk,
  deleteRisk
};
