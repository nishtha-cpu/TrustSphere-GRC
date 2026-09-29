const express = require('express');
const router = express.Router();
const consentController = require('../controllers/consentController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Mount authMiddleware on all Consent & Privacy routes
router.use(authMiddleware);

// ==========================================
// CONSENT PURPOSE ENDPOINTS
// ==========================================

// GET /api/consent-purposes - List processing purposes
router.get('/consent-purposes', requireRole('POLICY_MGR', 'RISK_MANAGER', 'AUDITOR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), consentController.getConsentPurposes);

// POST /api/consent-purposes - Create processing purpose
router.post('/consent-purposes', requireRole('POLICY_MGR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), consentController.createConsentPurpose);

// GET /api/consent-purposes/:id - Get purpose by ID
router.get('/consent-purposes/:id', requireRole('POLICY_MGR', 'RISK_MANAGER', 'AUDITOR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), consentController.getConsentPurposeById);

// PUT /api/consent-purposes/:id - Update purpose details
router.put('/consent-purposes/:id', requireRole('POLICY_MGR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), consentController.updateConsentPurpose);

// DELETE /api/consent-purposes/:id - Soft-delete purpose
router.delete('/consent-purposes/:id', requireRole('TENANT_ADMIN', 'SYSTEM_ADMIN'), consentController.deleteConsentPurpose);

// ==========================================
// CONSENT RECORD ENDPOINTS
// ==========================================

// GET /api/consents - List consent records
router.get('/consents', requireRole('POLICY_MGR', 'RISK_MANAGER', 'AUDITOR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), consentController.getConsents);

// POST /api/consents - Capture consent decision
router.post('/consents', requireRole('POLICY_MGR', 'RISK_MANAGER', 'AUDITOR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), consentController.createConsentRecord);

// GET /api/consents/:id - Get consent record details
router.get('/consents/:id', requireRole('POLICY_MGR', 'RISK_MANAGER', 'AUDITOR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), consentController.getConsentById);

// POST /api/consents/:id/withdraw - Withdraw consent decision (Atomic transaction)
router.post('/consents/:id/withdraw', requireRole('POLICY_MGR', 'RISK_MANAGER', 'AUDITOR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), consentController.withdrawConsent);

// ==========================================
// CONSENT HISTORY ENDPOINTS (READ ONLY)
// ==========================================

// GET /api/consents/:id/history - Read-only consent history audit log
router.get('/consents/:id/history', requireRole('POLICY_MGR', 'RISK_MANAGER', 'AUDITOR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'), consentController.getConsentHistory);

module.exports = router;
