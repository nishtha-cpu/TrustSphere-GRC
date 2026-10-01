const dataInventoryService = require('../services/dataInventoryService');

async function listDataAssets(req, res) {
  try {
    const data = await dataInventoryService.listDataAssets(req.user.tenantId, req.query);
    return res.status(200).json({ data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error listing data assets:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function addDataAsset(req, res) {
  try {
    const reqContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const asset = await dataInventoryService.addDataAsset(req.user.userId, req.user.tenantId, req.body, reqContext);
    return res.status(201).json({ message: 'Data asset added successfully', data: asset });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error adding data asset:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function listDataFlows(req, res) {
  try {
    const data = await dataInventoryService.listDataFlows(req.user.tenantId, req.query);
    return res.status(200).json({ data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error listing data flows:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function addDataFlow(req, res) {
  try {
    const reqContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const flow = await dataInventoryService.addDataFlow(req.user.userId, req.user.tenantId, req.body, reqContext);
    return res.status(201).json({ message: 'Data flow connection added', data: flow });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error adding data flow:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  listDataAssets,
  addDataAsset,
  listDataFlows,
  addDataFlow
};
