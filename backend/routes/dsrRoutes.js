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

const APPROVER_ROLES = [
  'POLICY_MGR',
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

// GET /api/dsr/:id/history - Immutable audit log history
router.get('/dsr/:id/history', requireRole(...ALLOWED_PRIVACY_ROLES), dsrController.getDSRHistory);

// PUT /api/dsr/:id - Update DSR details
router.put('/dsr/:id', requireRole(...ALLOWED_PRIVACY_ROLES), dsrController.updateDSR);

// PATCH /api/dsr/:id/status - Update DSR status
router.patch('/dsr/:id/status', requireRole(...ALLOWED_PRIVACY_ROLES), dsrController.updateDSRStatus);

// DPRM WORKFLOW STAGE ROUTES
// PATCH /api/dsr/:id/verify-identity - Identity Verification stage
router.patch('/dsr/:id/verify-identity', requireRole(...ALLOWED_PRIVACY_ROLES), dsrController.verifyIdentity);

// PATCH /api/dsr/:id/assign - Case Assignment stage
router.patch('/dsr/:id/assign', requireRole(...ALLOWED_PRIVACY_ROLES), dsrController.assignCase);

// PATCH /api/dsr/:id/collect-data - Data Collection stage
router.patch('/dsr/:id/collect-data', requireRole(...ALLOWED_PRIVACY_ROLES), dsrController.collectData);

// PATCH /api/dsr/:id/approve - Approval Workflow stage (Requires Approver Roles)
router.patch('/dsr/:id/approve', requireRole(...APPROVER_ROLES), dsrController.approveDSR);

// PATCH /api/dsr/:id/generate-response - Response Generation stage
router.patch('/dsr/:id/generate-response', requireRole(...ALLOWED_PRIVACY_ROLES), dsrController.generateResponse);

// PATCH /api/dsr/:id/close - Case Closure stage
router.patch('/dsr/:id/close', requireRole(...ALLOWED_PRIVACY_ROLES), dsrController.closeDSR);

// DELETE /api/dsr/:id - Soft-delete DSR (Admin role required)
router.delete('/dsr/:id', requireRole('TENANT_ADMIN', 'SYSTEM_ADMIN'), dsrController.deleteDSR);

module.exports = router;
