const express = require('express');
const router = express.Router();
const cookieController = require('../controllers/cookieController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const ALLOWED_ROLES = ['SYSTEM_ADMIN', 'TENANT_ADMIN', 'RISK_MANAGER', 'AUDITOR', 'POLICY_MGR', 'SEC_OFFICER'];

// Public / Banner Consent Recording Endpoint (No auth required for banner consent)
router.post('/consent', (req, res, next) => {
  if (!req.user) req.user = { tenantId: req.headers['x-tenant-id'] ? parseInt(req.headers['x-tenant-id']) : 1 };
  next();
}, cookieController.recordCookieConsent);

// Protected Admin & Inventory Endpoints
router.use(authMiddleware);

router.get('/inventory', requireRole(...ALLOWED_ROLES), cookieController.listCookies);
router.post('/inventory', requireRole('SYSTEM_ADMIN', 'TENANT_ADMIN', 'POLICY_MGR'), cookieController.addCookie);
router.get('/analytics', requireRole(...ALLOWED_ROLES), cookieController.getCookieAnalytics);

module.exports = router;
