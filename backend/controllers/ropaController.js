const ropaService = require('../services/ropaService');

async function listRoPARecords(req, res) {
  try {
    const data = await ropaService.listRoPARecords(req.user.tenantId, req.query);
    return res.status(200).json({ data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error listing RoPA records:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getRoPAById(req, res) {
  try {
    const ropa = await ropaService.getRoPAById(req.user.tenantId, req.params.id);
    if (!ropa) return res.status(404).json({ error: 'RoPA record not found' });
    return res.status(200).json({ data: ropa });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error getting RoPA record:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createRoPARecord(req, res) {
  try {
    const reqContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const ropa = await ropaService.createRoPARecord(req.user.userId, req.user.tenantId, req.body, reqContext);
    return res.status(201).json({ message: 'RoPA record created successfully', data: ropa });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error creating RoPA record:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateRoPARecord(req, res) {
  try {
    const reqContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const ropa = await ropaService.updateRoPARecord(req.user.userId, req.user.tenantId, req.params.id, req.body, reqContext);
    return res.status(200).json({ message: 'RoPA record updated successfully', data: ropa });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error updating RoPA record:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function archiveRoPARecord(req, res) {
  try {
    const reqContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const result = await ropaService.archiveRoPARecord(req.user.userId, req.user.tenantId, req.params.id, reqContext);
    return res.status(200).json({ message: result.message, data: result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error archiving RoPA record:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  listRoPARecords,
  getRoPAById,
  createRoPARecord,
  updateRoPARecord,
  archiveRoPARecord
};
