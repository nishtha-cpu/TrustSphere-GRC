const express = require('express');
const router = express.Router();
const consentController = require('../controllers/consentController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Mount authMiddleware on all Consent & Privacy routes
router.use(authMiddleware);

const ALLOWED_PRIVACY_ROLES = [
  'POLICY_MGR',
  'RISK_MANAGER',
  'AUDITOR',
  'SEC_OFFICER',
  'TENANT_ADMIN',
  'SYSTEM_ADMIN'
];

// ==========================================
// END-USER PREFERENCE CENTER ENDPOINTS
// Accessible to ANY authenticated user (Data Principal self-service)
// ==========================================

// GET /api/preference-center/my-preferences - Fetch logged-in user's consent preferences
router.get('/preference-center/my-preferences', consentController.getMyPreferences);

// POST /api/preference-center/my-preferences - Update logged-in user's consent preferences
router.post('/preference-center/my-preferences', consentController.updateMyPreferences);

// GET /api/preference-center/my-history - Fetch logged-in user's own consent audit history
router.get('/preference-center/my-history', consentController.getMyConsentHistory);

// GET /api/preference-center/download - Securely export logged-in user's own consent records
router.get('/preference-center/download', consentController.downloadMyConsentRecords);

// ==========================================
// CONSENT ANALYTICS ENDPOINTS
// ==========================================

// GET /api/consents/analytics/trends - Consent analytics & monthly trends
router.get('/consents/analytics/trends', requireRole(...ALLOWED_PRIVACY_ROLES), consentController.getConsentAnalyticsTrends);

// ==========================================
// CONSENT PURPOSE ENDPOINTS (ADMIN / PRIVACY STAFF)
// ==========================================

// GET /api/consent-purposes - List processing purposes
router.get('/consent-purposes', requireRole(...ALLOWED_PRIVACY_ROLES), consentController.getConsentPurposes);

// POST /api/consent-purposes - Create processing purpose
router.post('/consent-purposes', requireRole('POLICY_MGR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), consentController.createConsentPurpose);

// GET /api/consent-purposes/:id - Get purpose by ID
router.get('/consent-purposes/:id', requireRole(...ALLOWED_PRIVACY_ROLES), consentController.getConsentPurposeById);

// PUT /api/consent-purposes/:id - Update purpose details
router.put('/consent-purposes/:id', requireRole('POLICY_MGR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), consentController.updateConsentPurpose);

// DELETE /api/consent-purposes/:id - Soft-delete purpose
router.delete('/consent-purposes/:id', requireRole('TENANT_ADMIN', 'SYSTEM_ADMIN'), consentController.deleteConsentPurpose);

// ==========================================
// CONSENT RECORD ENDPOINTS (ADMIN / PRIVACY STAFF)
// ==========================================

// GET /api/consents - List consent records
router.get('/consents', requireRole(...ALLOWED_PRIVACY_ROLES), consentController.getConsents);

// POST /api/consents - Capture consent decision
router.post('/consents', requireRole(...ALLOWED_PRIVACY_ROLES), consentController.createConsentRecord);

// GET /api/consents/:id - Get consent record details
router.get('/consents/:id', requireRole(...ALLOWED_PRIVACY_ROLES), consentController.getConsentById);

// POST /api/consents/:id/withdraw - Withdraw consent decision (Atomic transaction)
router.post('/consents/:id/withdraw', requireRole(...ALLOWED_PRIVACY_ROLES), consentController.withdrawConsent);

// POST /api/consents/:id/renew - Renew consent decision
router.post('/consents/:id/renew', requireRole(...ALLOWED_PRIVACY_ROLES), consentController.renewConsent);

// ==========================================
// CONSENT HISTORY ENDPOINTS (READ ONLY)
// ==========================================

// GET /api/consents/:id/history - Read-only consent history audit log
router.get('/consents/:id/history', requireRole(...ALLOWED_PRIVACY_ROLES), consentController.getConsentHistory);

module.exports = router;
