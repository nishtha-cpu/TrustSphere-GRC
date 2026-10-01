const incidentService = require('../services/incidentService');

async function listIncidents(req, res) {
  try {
    const data = await incidentService.listIncidents(req.user.tenantId, req.query);
    return res.status(200).json({ data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error listing privacy incidents:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getIncidentById(req, res) {
  try {
    const incident = await incidentService.getIncidentById(req.user.tenantId, req.params.id);
    if (!incident) return res.status(404).json({ error: 'Privacy incident not found' });
    return res.status(200).json({ data: incident });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error getting privacy incident:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function createIncident(req, res) {
  try {
    const reqContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const incident = await incidentService.createIncident(req.user.userId, req.user.tenantId, req.body, reqContext);
    return res.status(201).json({ message: 'Privacy incident logged successfully', data: incident });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error logging privacy incident:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateIncidentStatus(req, res) {
  try {
    const reqContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const incident = await incidentService.updateIncidentStatus(req.user.userId, req.user.tenantId, req.params.id, req.body, reqContext);
    return res.status(200).json({ message: 'Privacy incident updated successfully', data: incident });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error updating privacy incident:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  listIncidents,
  getIncidentById,
  createIncident,
  updateIncidentStatus
};
