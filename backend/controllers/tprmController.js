const tprmService = require('../services/tprmService');

async function listVendors(req, res) {
  try {
    const data = await tprmService.listVendors(req.user.tenantId, req.query);
    return res.status(200).json({ data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error listing vendors:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getVendorById(req, res) {
  try {
    const vendor = await tprmService.getVendorById(req.user.tenantId, req.params.id);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    return res.status(200).json({ data: vendor });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error getting vendor:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createVendor(req, res) {
  try {
    const reqContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const vendor = await tprmService.createVendor(req.user.userId, req.user.tenantId, req.body, reqContext);
    return res.status(201).json({ message: 'Vendor created successfully', data: vendor });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error creating vendor:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createTPRMAssessment(req, res) {
  try {
    const reqContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const assessment = await tprmService.createTPRMAssessment(req.user.userId, req.user.tenantId, req.params.vendorId, req.body, reqContext);
    return res.status(201).json({ message: 'TPRM assessment created successfully', data: assessment });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error creating TPRM assessment:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function addTPRMFinding(req, res) {
  try {
    const finding = await tprmService.addTPRMFinding(req.user.userId, req.user.tenantId, req.params.vendorId, req.body);
    return res.status(201).json({ message: 'TPRM finding recorded', data: finding });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error recording TPRM finding:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  listVendors,
  getVendorById,
  createVendor,
  createTPRMAssessment,
  addTPRMFinding
};
