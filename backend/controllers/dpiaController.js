const dpiaService = require('../services/dpiaService');

async function listDPIAs(req, res) {
  try {
    const data = await dpiaService.listDPIAs(req.user.tenantId, req.query);
    return res.status(200).json({ data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error listing DPIAs:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getDPIAById(req, res) {
  try {
    const dpia = await dpiaService.getDPIAById(req.user.tenantId, req.params.id);
    if (!dpia) return res.status(404).json({ error: 'DPIA assessment not found' });
    return res.status(200).json({ data: dpia });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error getting DPIA:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createDPIA(req, res) {
  try {
    const reqContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const dpia = await dpiaService.createDPIA(req.user.userId, req.user.tenantId, req.body, reqContext);
    return res.status(201).json({ message: 'DPIA assessment created successfully', data: dpia });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error creating DPIA:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateDPIAStatus(req, res) {
  try {
    const reqContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const dpia = await dpiaService.updateDPIAStatus(req.user.userId, req.user.tenantId, req.params.id, req.body, reqContext);
    return res.status(200).json({ message: 'DPIA status updated', data: dpia });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error updating DPIA status:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function addDPIARemediation(req, res) {
  try {
    const remediation = await dpiaService.addDPIARemediation(req.user.userId, req.user.tenantId, req.params.id, req.body);
    return res.status(201).json({ message: 'Remediation added successfully', data: remediation });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error adding DPIA remediation:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  listDPIAs,
  getDPIAById,
  createDPIA,
  updateDPIAStatus,
  addDPIARemediation
};
