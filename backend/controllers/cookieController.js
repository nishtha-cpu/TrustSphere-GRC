const cookieService = require('../services/cookieService');

async function listCookies(req, res) {
  try {
    const data = await cookieService.listCookies(req.user.tenantId, req.query);
    return res.status(200).json({ data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error listing cookies:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function addCookie(req, res) {
  try {
    const reqContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const cookie = await cookieService.addCookie(req.user.userId, req.user.tenantId, req.body, reqContext);
    return res.status(201).json({ message: 'Cookie added to inventory', data: cookie });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error adding cookie:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function recordCookieConsent(req, res) {
  try {
    const reqContext = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const result = await cookieService.recordCookieConsent(req.user.tenantId, req.body, reqContext);
    return res.status(201).json({ message: 'Cookie consent recorded', data: result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error recording cookie consent:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getCookieAnalytics(req, res) {
  try {
    const data = await cookieService.getCookieAnalytics(req.user.tenantId);
    return res.status(200).json({ data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error('Error getting cookie analytics:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  listCookies,
  addCookie,
  recordCookieConsent,
  getCookieAnalytics
};
