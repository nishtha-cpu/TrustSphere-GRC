# Phase 2 — Consent & Privacy Management Complete Specification & Verification Report

## Executive Summary
This document provides the authoritative technical documentation for **Phase 2 — Consent & Privacy Management** of the TrustSphere-GRC platform. 

Phase 2 establishes a complete, enterprise-grade Privacy module encompassing **Consent Purpose Management**, **Data Subject Consent Recording & Withdrawal**, **Immutable Consent Audit Trail**, **Data Subject Rights (DSR) Management**, **Real-Time Privacy Summary Dashboard Metrics**, and **Strict Tenant-Isolated RBAC**.

---

## 1. Consent Architecture
- **Layered Structure**: Route (`/api/consent-purposes`, `/api/consents`) &rarr; Controller &rarr; Service &rarr; MySQL InnoDB Database.
- **Authentication & Security Context**: All requests are authenticated via JWT Bearer token (`authMiddleware`). `req.user.tenantId` is authoritative; client-supplied `tenant_id` parameters in query or body are strictly ignored to prevent cross-tenant parameter tampering.
- **Role-Based Authorization**: Evaluated dynamically on each request via `requireRole` middleware.

---

## 2. Consent Database Schema
The database foundation comprises three relational InnoDB tables:

1. **`consent_purposes`**:
   - `id`, `tenant_id`, `purpose_code` (unique per tenant), `name`, `description`, `legal_basis` (`CONSENT`, `CONTRACT`, `LEGAL_OBLIGATION`, `VITAL_INTERESTS`, `PUBLIC_TASK`, `LEGITIMATE_INTERESTS`), `status` (`ACTIVE`, `INACTIVE`, `ARCHIVED`), `version` (auto-incremented on edit), `created_at`, `updated_at`, `deleted_at`.

2. **`consent_records`**:
   - `id`, `tenant_id`, `purpose_id`, `user_id` (nullable FK to app user), `data_subject_identifier` (lowercased unique string for app user or external subject), `status` (`GRANTED`, `DENIED`, `WITHDRAWN`), `consent_version`, `source`, `ip_address`, `user_agent`, `collected_at`, `withdrawn_at`, `expires_at`, `metadata`, `created_at`, `updated_at`, `deleted_at`.

3. **`consent_history`** (Immutable Audit Trail):
   - `id`, `tenant_id`, `consent_record_id`, `previous_status`, `new_status`, `action` (`CONSENT_GIVEN`, `CONSENT_DENIED`, `CONSENT_WITHDRAWN`), `source`, `performed_by` (user ID), `performed_at`, `ip_address`, `user_agent`, `notes`, `metadata`.

---

## 3. Consent Backend APIs
- `GET /api/consent-purposes`: List purposes (filtered by `status`, `legal_basis`, `search`).
- `GET /api/consent-purposes/:id`: Fetch single purpose details.
- `POST /api/consent-purposes`: Create new processing purpose.
- `PUT /api/consent-purposes/:id`: Update purpose metadata (increments `version`).
- `DELETE /api/consent-purposes/:id`: Soft-delete/archive purpose (`status = 'ARCHIVED'`).
- `GET /api/consents`: List consent decisions (filtered by `status`, `purpose_id`, `data_subject_identifier`, `user_id`, `search`).
- `GET /api/consents/:id`: Fetch single consent record.
- `POST /api/consents`: Atomic capture of initial consent decision (creates `consent_records` + initial `consent_history` row in single MySQL transaction).
- `POST /api/consents/:id/withdraw`: Atomic withdrawal of consent (`GRANTED` &rarr; `WITHDRAWN`, populates `withdrawn_at`, creates `CONSENT_WITHDRAWN` history row).
- `GET /api/consents/:id/history`: Read-only chronological audit log (PUT/DELETE HTTP endpoints strictly forbidden).

---

## 4. Consent UI & Polish
- **Navigation & Views**: Integrated into primary header navigation (**Consent & Privacy** tab).
- **Tabbed Sub-Views**:
  - **Processing Purposes**: Shows Purpose Code, Name, Legal Basis (GDPR Art. 6 breakdown), Version, Status, and Actions.
  - **Consent Records**: Shows Data Subject, Purpose Name & Code, Status, Version, Source, Collected At, Withdrawn At, and Actions.
- **Visual Status Badges**:
  - Purpose: `ACTIVE` (green), `INACTIVE` (amber/grey), `ARCHIVED` (dark muted).
  - Consent: `GRANTED` (green), `DENIED` (red), `WITHDRAWN` (amber/purple warning).
- **Confirmation Step**: "Withdraw Consent" triggers a mandatory confirmation modal explaining that withdrawal will update the current status to `WITHDRAWN` and write an immutable audit log row.

---

## 5. Consent Lifecycle & Transactional Withdrawal
- Initial decision recorded as `GRANTED` or `DENIED`.
- Withdrawal requires current status to be `GRANTED` (attempts to re-withdraw `WITHDRAWN` or `DENIED` consent return `HTTP 400 Bad Request`).
- Withdrawal executes inside a MySQL transaction:
  1. `UPDATE consent_records SET status = 'WITHDRAWN', withdrawn_at = NOW()`
  2. `INSERT INTO consent_history (action = 'CONSENT_WITHDRAWN', previous_status = 'GRANTED', new_status = 'WITHDRAWN')`

---

## 6. Consent History & Audit Trail
- Sequential append-only audit trail.
- History endpoint is read-only (`GET /api/consents/:id/history`).
- No mutation endpoints (`PUT` / `DELETE` / `PATCH`) exist for `consent_history`.

---

## 7. Data Subject Requests (DSR) Database Schema
- **`data_subject_requests`**:
  - `id` (`BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`), `tenant_id` (`BIGINT UNSIGNED`), `request_reference` (auto-generated `DSR-YYYYMMDD-XXXX`), `data_subject_identifier`, `user_id` (nullable app user FK), `request_type` (`ACCESS`, `RECTIFICATION`, `ERASURE`, `RESTRICTION`, `PORTABILITY`, `OBJECTION`), `status` (`RECEIVED`, `IN_REVIEW`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`, `CANCELLED`), `description`, `received_at`, `due_at` (default 30 days statutory window), `completed_at`, `assigned_to` (nullable handler user FK), `resolution_notes`, `created_at`, `updated_at`, `deleted_at`.

---

## 8. DSR Backend APIs
- `GET /api/dsr`: List Data Subject Requests (supports `status`, `request_type`, `assigned_to`, `search`).
- `GET /api/dsr/:id`: Fetch single DSR details.
- `POST /api/dsr`: Log new DSR request.
- `PUT /api/dsr/:id`: Update description, due date, assigned handler, or request type.
- `PATCH /api/dsr/:id/status`: Update request lifecycle status (`RECEIVED` &rarr; `IN_REVIEW` &rarr; `IN_PROGRESS` &rarr; `COMPLETED`/`REJECTED`/`CANCELLED`). Automates `completed_at` population on completion.
- `DELETE /api/dsr/:id`: Soft-delete DSR (`deleted_at = NOW()`).

---

## 9. DSR UI Components & Page
- **`DSRManagementPage.jsx`**: Top header, real-time Privacy Summary Dashboard cards, filter/search bar, DSR table, and action modals.
- **`DSRTable.jsx`**: Displays Reference, Data Subject, Request Type badge, Status badge, Received Date, Statutory Due Date (highlighted with ⚠️ if overdue), Assigned Handler, and Actions.
- **`DSRForm.jsx`**: Modal form for logging DSRs with statutory due date windows (15, 30, or 60 days) and handler assignment.
- **`DSRDetailsModal.jsx`**: Modal rendering complete request overview, scope description, resolution notes input, and lifecycle status transition controls.

---

## 10. Privacy Summary Dashboard
- **`PrivacySummaryCards.jsx`**: Metrics loaded live from `GET /api/privacy/stats`:
  - **Consent Metrics**: Total Consents, Granted, Denied, Withdrawn, Expired.
  - **Purpose Metrics**: Active Purposes, Archived Purposes.
  - **DSR Metrics**: Total Requests, Received, In Review, In Progress, Completed, Rejected, Cancelled.

---

## 11. Role-Based Access Control (RBAC) & Tenant Isolation
- **Allowed Roles for Privacy Operations**: `POLICY_MGR`, `RISK_MANAGER`, `AUDITOR`, `SEC_OFFICER`, `TENANT_ADMIN`, `SYSTEM_ADMIN`.
- **Destructive Operations (Archive Purpose, Soft-Delete DSR)**: Require `TENANT_ADMIN` or `SYSTEM_ADMIN`.
- **Tenant Isolation**: Cross-tenant resource queries return `HTTP 404 Not Found` without disclosing resource existence.
- **Role Revocation**: Direct removal of a role in the `user_roles` database table immediately revokes permissions on the very next HTTP request (`HTTP 403 Forbidden`).

---

## 12. Verification & Test Results

| Test Suite | Assertions / Tests | Result |
| :--- | :---: | :---: |
| **Phase 2 Privacy E2E Suite** (`test_phase2_privacy_e2e.js`) | **66 / 66** | **100% PASSED** |
| **Step 10C Consent Frontend Integration** (`test_step10c_consent_frontend.js`) | **16 / 16** | **100% PASSED** |
| **Step 10B Consent API** (`test_step10b_consent_api.js`) | **35 / 35** | **100% PASSED** |
| **Step 9G Auth & Security Hardening** (`test_step9g_auth_security.js`) | **40 / 40** | **100% PASSED** |
| **Step 9F RBAC** (`test_step9f_rbac.js`) | **32 / 32** | **100% PASSED** |
| **Step 9E Tenant Context Migration** (`test_step9e_tenant_context.js`) | **40 / 40** | **100% PASSED** |
| **Frontend Production Build** (`npm run build`) | **0 Errors** | **PASSED (445ms)** |

---

## 13. Known Limitations
- DSR notification emails are queued in database records; SMTP delivery services can be attached in Phase 3.
- All statistical metrics are sourced from real-time database queries; Redis caching can be added for high-throughput multi-region clusters.
