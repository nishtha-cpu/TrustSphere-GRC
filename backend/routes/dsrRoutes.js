const express = require('express');
const router = express.Router();
const dsrController = require('../controllers/dsrController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Mount authMiddleware on all DSR & Privacy Summary routes
router.use(authMiddleware);

const ALLOWED_PRIVACY_ROLES = [
  'POLICY_MGR',
  'RISK_MANAGER',
  'AUDITOR',
  'SEC_OFFICER',
  'TENANT_ADMIN',
  'SYSTEM_ADMIN'
];

// GET /api/privacy/stats - Privacy Summary Dashboard Metrics
router.get('/privacy/stats', requireRole(...ALLOWED_PRIVACY_ROLES), dsrController.getPrivacySummaryStats);

// GET /api/dsr - List Data Subject Requests
router.get('/dsr', requireRole(...ALLOWED_PRIVACY_ROLES), dsrController.getDSRs);

// POST /api/dsr - Create Data Subject Request
router.post('/dsr', requireRole(...ALLOWED_PRIVACY_ROLES), dsrController.createDSR);

// GET /api/dsr/:id - Get DSR details
router.get('/dsr/:id', requireRole(...ALLOWED_PRIVACY_ROLES), dsrController.getDSRById);

// PUT /api/dsr/:id - Update DSR details
router.put('/dsr/:id', requireRole(...ALLOWED_PRIVACY_ROLES), dsrController.updateDSR);

// PATCH /api/dsr/:id/status - Update DSR lifecycle status
router.patch('/dsr/:id/status', requireRole(...ALLOWED_PRIVACY_ROLES), dsrController.updateDSRStatus);

// DELETE /api/dsr/:id - Soft-delete DSR (Admin role required)
router.delete('/dsr/:id', requireRole('TENANT_ADMIN', 'SYSTEM_ADMIN'), dsrController.deleteDSR);

module.exports = router;
