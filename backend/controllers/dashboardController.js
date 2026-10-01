const dashboardService = require('../services/dashboardService');

async function getComplianceDashboard(req, res) {
  try {
    const data = await dashboardService.getComplianceDashboard(req.user.tenantId);
    return res.status(200).json({ data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error fetching compliance dashboard:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getComplianceDashboard
};
