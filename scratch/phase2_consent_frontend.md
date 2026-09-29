# Phase 2 — Consent & Privacy Management: React Frontend Architecture & Implementation Report

## Executive Summary
This document records the design, component structure, state-based navigation integration, service layer, role permission UX, and verification results for **Step 10C — Consent & Privacy Management React Frontend UI**.

The implementation connects to the secure Step 10B Consent & Privacy backend REST APIs, using the existing JWT authentication mechanism (`apiFetch` from `apiClient.js`) without introducing duplicate API clients or exposing internal tenant parameters.

---

## 1. Architecture & Services

### Service Layer: `frontend/src/services/consentService.js`
Uses `apiFetch()` to transparently inject JWT authorization header (`Bearer <token>`) and handle server-side tenant scoping.

#### Purpose Management API Wrappers:
- `listPurposes(params)`: `GET /api/consent-purposes` (supports `status`, `legal_basis`, `search`)
- `getPurpose(id)`: `GET /api/consent-purposes/:id`
- `createPurpose(data)`: `POST /api/consent-purposes`
- `updatePurpose(id, data)`: `PUT /api/consent-purposes/:id`
- `archivePurpose(id)`: `DELETE /api/consent-purposes/:id`

#### Consent Record API Wrappers:
- `listConsents(params)`: `GET /api/consents` (supports `status`, `purpose_id`, `data_subject_type`, `data_subject_id`, `user_id`, `search`)
- `getConsent(id)`: `GET /api/consents/:id`
- `createConsent(data)`: `POST /api/consents`
- `withdrawConsent(id, payload)`: `POST /api/consents/:id/withdraw`
- `getConsentHistory(id)`: `GET /api/consents/:id/history`

---

## 2. Pages Created

1. **`frontend/src/pages/ConsentManagementPage.jsx`**
   - Tabbed layout: **Processing Purposes** tab vs **Consent Records** tab.
   - Purpose search and status filtering (`ACTIVE`, `INACTIVE`, `ARCHIVED`).
   - Consent search and status/purpose filtering (`GRANTED`, `DENIED`, `WITHDRAWN`).
   - Modals for creating/editing processing purposes and recording consents.

2. **`frontend/src/pages/ConsentDetailsPage.jsx`**
   - Renders data subject details, linked user IDs, purpose scope, and lifecycle dates.
   - Provides **"Withdraw Consent"** action button when status is `GRANTED`.
   - Embeds `ConsentHistory` audit component displaying full immutable log chain.

---

## 3. Components Created

1. **`frontend/src/components/consent/PurposeTable.jsx`**
   - Table showing Purpose Code, Name, Legal Basis (GDPR Art. 6 breakdown), Version, Status, and Actions (View, Edit, Archive).
   - Handles loading, empty, and error states.

2. **`frontend/src/components/consent/PurposeForm.jsx`**
   - Modal form for creating and updating processing purposes.
   - Enforces immutable purpose code on edit.
   - Supported legal bases: `CONSENT`, `CONTRACT`, `LEGAL_OBLIGATION`, `VITAL_INTERESTS`, `PUBLIC_TASK`, `LEGITIMATE_INTERESTS`.

3. **`frontend/src/components/consent/ConsentTable.jsx`**
   - Table showing Data Subject, Purpose Code & Name, Status, Consent Version, Source, Collected At, Withdrawn At, and Actions.
   - Renders green (`GRANTED`), red (`DENIED`), or warning (`WITHDRAWN`) status badges.

4. **`frontend/src/components/consent/ConsentForm.jsx`**
   - Form capturing data subject consent.
   - Supports application users (`user_id` selection) vs external data subjects (`data_subject_identifier`).
   - Initial status selection: `GRANTED` or `DENIED`.

5. **`frontend/src/components/consent/ConsentHistory.jsx`**
   - Chronological audit log renderer.
   - Visual badge emphasizing append-only immutable history.
   - No edit or delete capabilities exposed.

---

## 4. Navigation & UX Integration

- **`Header.jsx`**: Added "Consent & Privacy" navigation tab link (`activeTab === 'consent'`).
- **`App.jsx`**: Added view routing for `'consent'` and `'consent-details'`.
- Preserved existing Phase 1 views (`'register'`, `'matrix'`, `'audits'`, `'policies'`).

---

## 5. Permission UX & Error Handling

- **Permission UX**:
  - Purpose creation/edit: `POLICY_MGR`, `TENANT_ADMIN`, `SYSTEM_ADMIN`
  - Purpose archive: `TENANT_ADMIN`, `SYSTEM_ADMIN`
  - Consent operations: `POLICY_MGR`, `RISK_MANAGER`, `AUDITOR`, `SEC_OFFICER`, `TENANT_ADMIN`, `SYSTEM_ADMIN`
- **Error Handling**:
  - HTTP 401: Clears session and redirects to login (via `apiClient.js` / `AuthContext`).
  - HTTP 403: Displays inline/banner permission warning ("You do not have permission to perform this action.") without logging out the user.
  - HTTP 400/409: Renders specific backend validation or conflict messages.

---

## 6. Verification Results

1. **Step 10C Frontend E2E Suite (`scratch/test_step10c_consent_frontend.js`)**: **16/16 Passed**
2. **Step 10B Backend Consent API Regression (`test_step10b_consent_api.js`)**: **35/35 Passed**
3. **Step 9G Auth & Security Regression (`test_step9g_auth_security.js`)**: **40/40 Passed**
4. **Step 9F RBAC Regression (`test_step9f_rbac.js`)**: **32/32 Passed**
5. **Frontend Production Build (`npm run build`)**: **0 Errors**

---

## 7. Known Limitations
- External data subjects are identified via string identifiers (email/UUID); external verification mechanisms (e.g. magic link confirmation) can be layered in Phase 3.
- History view is read-only by design; table sorting is pinned to chronological execution sequence (`performed_at ASC`).
