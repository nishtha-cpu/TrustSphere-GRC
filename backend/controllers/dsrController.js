const dsrService = require('../services/dsrService');

/**
 * ==========================================
 * DATA SUBJECT REQUEST (DSR) CONTROLLER
 * ==========================================
 */

async function getDSRs(req, res) {
  try {
    const filters = {
      status: req.query.status,
      request_type: req.query.request_type,
      assigned_to: req.query.assigned_to,
      user_id: req.query.user_id,
      search: req.query.search
    };
    const dsrs = await dsrService.getDSRs(req.user.tenantId, filters);
    return res.status(200).json({ data: dsrs });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error fetching DSRs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getDSRById(req, res) {
  try {
    const { id } = req.params;
    const dsr = await dsrService.getDSRById(req.user.tenantId, id);
    if (!dsr) {
      return res.status(404).json({ error: 'Data Subject Request not found' });
    }
    return res.status(200).json({ data: dsr });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error fetching DSR by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createDSR(req, res) {
  try {
    const dsr = await dsrService.createDSR(req.user.tenantId, req.body);
    return res.status(201).json({
      message: 'Data Subject Request created successfully',
      data: dsr
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error creating DSR:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateDSR(req, res) {
  try {
    const { id } = req.params;
    const updated = await dsrService.updateDSR(req.user.tenantId, id, req.body);
    return res.status(200).json({
      message: 'Data Subject Request updated successfully',
      data: updated
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error updating DSR:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateDSRStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, resolution_notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const updated = await dsrService.updateDSRStatus(req.user.tenantId, id, status, resolution_notes);
    return res.status(200).json({
      message: 'DSR status updated successfully',
      data: updated
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error updating DSR status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteDSR(req, res) {
  try {
    const { id } = req.params;
    const result = await dsrService.deleteDSR(req.user.tenantId, id);
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error deleting DSR:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPrivacySummaryStats(req, res) {
  try {
    const stats = await dsrService.getPrivacySummaryStats(req.user.tenantId);
    return res.status(200).json({ data: stats });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error fetching privacy summary stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getDSRs,
  getDSRById,
  createDSR,
  updateDSR,
  updateDSRStatus,
  deleteDSR,
  getPrivacySummaryStats
};
