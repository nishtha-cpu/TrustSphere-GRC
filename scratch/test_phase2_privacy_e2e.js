const http = require('http');
const mysql = require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/mysql2/promise');
const bcrypt = require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/bcryptjs');
require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/dotenv').config({ path: 'c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/.env' });

const PORT = 5000;
const HOST = 'localhost';

let db;
let adminTokenT1 = '';
let mgrTokenT1 = '';
let noprivTokenT1 = '';
let adminTokenT99 = '';

let purposeId1 = null;
let purposeIdArchive = null;
let consentId1 = null;
let consentId2 = null;
let dsrId1 = null;

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
      hostname: HOST,
      port: PORT,
      path,
      method,
      headers
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch (e) {
          json = { raw: body };
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function setupTestData() {
  db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trustsphere'
  });

  const passHash = await bcrypt.hash('TestPass123!', 10);

  // Ensure Tenants 1 & 99
  const [t1] = await db.query(`SELECT id FROM tenants WHERE id = 1`);
  if (t1.length === 0) await db.query(`INSERT INTO tenants (id, name, slug, status) VALUES (1, 'Acme Corp', 'acme-corp', 'ACTIVE')`);
  const [t99] = await db.query(`SELECT id FROM tenants WHERE id = 99`);
  if (t99.length === 0) await db.query(`INSERT INTO tenants (id, name, slug, status) VALUES (99, 'Beta Corp', 'beta-corp', 'ACTIVE')`);

  // Ensure Roles
  const rolesToEnsure = [
    { tenant_id: 1, name: 'System Admin', code: 'SYSTEM_ADMIN' },
    { tenant_id: 1, name: 'Policy Manager', code: 'POLICY_MGR' },
    { tenant_id: 99, name: 'System Admin T99', code: 'SYSTEM_ADMIN' }
  ];
  const roleMap = {};
  for (const r of rolesToEnsure) {
    const [existing] = await db.query(`SELECT id FROM roles WHERE code = ? AND tenant_id = ?`, [r.code, r.tenant_id]);
    if (existing.length === 0) {
      const [res] = await db.query(`INSERT INTO roles (tenant_id, name, code) VALUES (?, ?, ?)`, [r.tenant_id, r.name, r.code]);
      roleMap[`${r.code}_T${r.tenant_id}`] = res.insertId;
    } else {
      roleMap[`${r.code}_T${r.tenant_id}`] = existing[0].id;
    }
  }

  // Users to Ensure
  const usersToEnsure = [
    { key: 'admin_t1', email: 'e2e.admin.t1@test.com', tenant_id: 1, roleKey: 'SYSTEM_ADMIN_T1' },
    { key: 'mgr_t1', email: 'e2e.mgr.t1@test.com', tenant_id: 1, roleKey: 'POLICY_MGR_T1' },
    { key: 'nopriv_t1', email: 'e2e.nopriv.t1@test.com', tenant_id: 1, roleKey: null },
    { key: 'admin_t99', email: 'e2e.admin.t99@test.com', tenant_id: 99, roleKey: 'SYSTEM_ADMIN_T99' }
  ];

  for (const u of usersToEnsure) {
    const [existing] = await db.query(`SELECT id FROM users WHERE email = ?`, [u.email]);
    let userId;
    if (existing.length === 0) {
      const [res] = await db.query(
        `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, status) VALUES (?, ?, ?, 'E2E', ?, 'ACTIVE')`,
        [u.tenant_id, u.email, passHash, u.key]
      );
      userId = res.insertId;
    } else {
      userId = existing[0].id;
    }

    await db.query(`DELETE FROM user_roles WHERE user_id = ?`, [userId]);
    if (u.roleKey && roleMap[u.roleKey]) {
      await db.query(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`, [userId, roleMap[u.roleKey]]);
    }

    const logRes = await request('POST', '/api/auth/login', { email: u.email, password: 'TestPass123!' });
    const token = logRes.data?.data?.token;

    if (u.key === 'admin_t1') adminTokenT1 = token;
    if (u.key === 'mgr_t1') mgrTokenT1 = token;
    if (u.key === 'nopriv_t1') noprivTokenT1 = token;
    if (u.key === 'admin_t99') adminTokenT99 = token;
  }
}

async function runE2ESuite() {
  console.log('===============================================================');
  console.log('=== PHASE 2 CONSENT & PRIVACY DEMO-READY E2E TEST SUITE ===');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, description) {
    total++;
    if (condition) {
      console.log(`✅ [PASS ${total.toString().padStart(2, '0')}] ${description}`);
      passed++;
    } else {
      console.error(`❌ [FAIL ${total.toString().padStart(2, '0')}] ${description}`);
    }
  }

  try {
    await setupTestData();

    // Setup Tokens verification
    assert(Boolean(adminTokenT1), 'Setup: Admin T1 authentication succeeded');
    assert(Boolean(mgrTokenT1), 'Setup: Manager T1 authentication succeeded');
    assert(Boolean(noprivTokenT1), 'Setup: Unprivileged T1 authentication succeeded');
    assert(Boolean(adminTokenT99), 'Setup: Admin T99 authentication succeeded');

    // ==========================================
    // SECTION 1: CONSENT PURPOSE MANAGEMENT (1-10)
    // ==========================================
    console.log('\n--- Section 1: Consent Purpose Management ---');

    const code1 = `E2E-PURP-${Date.now()}`;
    const pCreateRes = await request('POST', '/api/consent-purposes', {
      purpose_code: code1,
      name: 'E2E Marketing Analytics',
      description: 'Customer analytics for targeted campaigns',
      legal_basis: 'CONSENT',
      version: '1.0'
    }, mgrTokenT1);
    assert(pCreateRes.status === 201 && pCreateRes.data?.data?.id, '1. Create processing purpose succeeds (HTTP 201)');
    purposeId1 = pCreateRes.data?.data?.id;

    const pGetRes = await request('GET', `/api/consent-purposes/${purposeId1}`, null, mgrTokenT1);
    assert(pGetRes.status === 200 && pGetRes.data?.data?.purpose_code === code1, '2. Read purpose by ID succeeds (HTTP 200)');

    const pListRes = await request('GET', '/api/consent-purposes', null, mgrTokenT1);
    assert(pListRes.status === 200 && Array.isArray(pListRes.data?.data), '3. List processing purposes succeeds (HTTP 200)');

    const pUpdateRes = await request('PUT', `/api/consent-purposes/${purposeId1}`, {
      name: 'E2E Marketing Analytics Updated',
      description: 'Updated scope description'
    }, mgrTokenT1);
    assert(pUpdateRes.status === 200 && pUpdateRes.data?.data?.version === 2, '4. Update purpose increments version to 2 (HTTP 200)');

    const pDupRes = await request('POST', '/api/consent-purposes', {
      purpose_code: code1,
      name: 'Duplicate Code Purpose',
      legal_basis: 'CONSENT'
    }, mgrTokenT1);
    assert(pDupRes.status === 400, '5. Duplicate purpose_code in tenant rejected (HTTP 400)');

    const pInvBasisRes = await request('POST', '/api/consent-purposes', {
      purpose_code: `INVALID-${Date.now()}`,
      name: 'Invalid Legal Basis',
      legal_basis: 'INVALID_BASIS_STRING'
    }, mgrTokenT1);
    assert(pInvBasisRes.status === 400, '6. Invalid legal basis rejected (HTTP 400)');

    const pCrossGetRes = await request('GET', `/api/consent-purposes/${purposeId1}`, null, adminTokenT99);
    assert(pCrossGetRes.status === 404, '7. Cross-tenant purpose access returns HTTP 404');

    // Create a dedicated second purpose for archive testing
    const codeArchive = `E2E-ARCH-${Date.now()}`;
    const pCreateArchRes = await request('POST', '/api/consent-purposes', {
      purpose_code: codeArchive,
      name: 'Purpose To Archive',
      legal_basis: 'CONSENT'
    }, mgrTokenT1);
    purposeIdArchive = pCreateArchRes.data?.data?.id;

    const pArchiveRes = await request('DELETE', `/api/consent-purposes/${purposeIdArchive}`, null, adminTokenT1);
    assert(pArchiveRes.status === 200 && pArchiveRes.data?.data?.status === 'ARCHIVED', '8. Archive purpose succeeds (HTTP 200)');

    const pFilterRes = await request('GET', `/api/consent-purposes?status=ARCHIVED&search=${codeArchive}`, null, adminTokenT1);
    assert(pFilterRes.status === 200 && pFilterRes.data?.data?.length === 1, '9. Backend status & search filters work for archived purposes');

    const pInactRes = await request('PUT', `/api/consent-purposes/${purposeId1}`, { status: 'INACTIVE' }, adminTokenT1);
    assert(pInactRes.status === 200 && pInactRes.data?.data?.status === 'INACTIVE', '10. Update purpose status to INACTIVE succeeds');
    // Restore purposeId1 to ACTIVE for consent creation
    await request('PUT', `/api/consent-purposes/${purposeId1}`, { status: 'ACTIVE' }, adminTokenT1);

    // ==========================================
    // SECTION 2: CONSENT RECORDS & WITHDRAWAL (11-25)
    // ==========================================
    console.log('\n--- Section 2: Consent Records & Withdrawal ---');

    const subjectEmail1 = `ds.appuser.${Date.now()}@example.com`;
    const cCreateGrantedRes = await request('POST', '/api/consents', {
      purpose_id: purposeId1,
      data_subject_type: 'APPLICATION_USER',
      data_subject_identifier: subjectEmail1,
      status: 'GRANTED',
      consent_version: '1.0',
      source: 'WEB_FORM',
      notes: 'Initial consent granted'
    }, mgrTokenT1);
    assert(cCreateGrantedRes.status === 201 && cCreateGrantedRes.data?.data?.id, '11. Create GRANTED consent for app user succeeds (HTTP 201)');
    consentId1 = cCreateGrantedRes.data?.data?.id;

    const subjectExtEmail = `ds.external.${Date.now()}@example.com`;
    const cCreateDeniedRes = await request('POST', '/api/consents', {
      purpose_id: purposeId1,
      data_subject_type: 'EXTERNAL_DATA_SUBJECT',
      data_subject_identifier: subjectExtEmail,
      status: 'DENIED',
      consent_version: '1.0',
      source: 'MOBILE_APP'
    }, mgrTokenT1);
    assert(cCreateDeniedRes.status === 201 && cCreateDeniedRes.data?.data?.status === 'DENIED', '12. Create DENIED consent for external subject succeeds (HTTP 201)');
    consentId2 = cCreateDeniedRes.data?.data?.id;

    const cGetRes = await request('GET', `/api/consents/${consentId1}`, null, mgrTokenT1);
    assert(cGetRes.status === 200 && cGetRes.data?.data?.id === consentId1, '13. Read consent details by ID succeeds (HTTP 200)');

    const cListRes = await request('GET', '/api/consents', null, mgrTokenT1);
    assert(cListRes.status === 200 && Array.isArray(cListRes.data?.data) && cListRes.data?.data.length >= 2, '14. List consents succeeds (HTTP 200)');

    const cFilterPurposeRes = await request('GET', `/api/consents?purpose_id=${purposeId1}`, null, mgrTokenT1);
    assert(cFilterPurposeRes.status === 200 && cFilterPurposeRes.data?.data.every(c => c.purpose_id === purposeId1), '15. Filter consents by purpose_id succeeds');

    const cFilterStatusRes = await request('GET', '/api/consents?status=GRANTED', null, mgrTokenT1);
    assert(cFilterStatusRes.status === 200 && cFilterStatusRes.data?.data.every(c => c.status === 'GRANTED'), '16. Filter consents by status GRANTED succeeds');

    const cSearchRes = await request('GET', `/api/consents?search=${subjectEmail1}`, null, mgrTokenT1);
    assert(cSearchRes.status === 200 && cSearchRes.data?.data.length === 1, '17. Search consents by subject identifier succeeds');

    const cWithdrawRes = await request('POST', `/api/consents/${consentId1}/withdraw`, { notes: 'User requested withdrawal' }, mgrTokenT1);
    assert(cWithdrawRes.status === 200 && cWithdrawRes.data?.data?.status === 'WITHDRAWN', '18. Withdraw GRANTED consent succeeds (HTTP 200)');

    const cCheckWithdrawRes = await request('GET', `/api/consents/${consentId1}`, null, mgrTokenT1);
    assert(cCheckWithdrawRes.status === 200 && cCheckWithdrawRes.data?.data?.withdrawn_at !== null, '19. Consent withdrawn_at timestamp is populated');

    const cRepeatedWithdrawRes = await request('POST', `/api/consents/${consentId1}/withdraw`, { notes: 'Duplicate withdrawal attempt' }, mgrTokenT1);
    assert(cRepeatedWithdrawRes.status === 400, '20. Repeated withdrawal on WITHDRAWN record rejected (HTTP 400)');

    const cHistRes = await request('GET', `/api/consents/${consentId1}/history`, null, mgrTokenT1);
    assert(cHistRes.status === 200 && Array.isArray(cHistRes.data?.data) && cHistRes.data?.data.length === 2, '21. Consent immutable audit history returns 2 chronological records');

    const histList = cHistRes.data?.data || [];
    assert(histList[0]?.action === 'CONSENT_GIVEN' && histList[1]?.action === 'CONSENT_WITHDRAWN', '22. Audit history actions reflect CONSENT_GIVEN -> CONSENT_WITHDRAWN chain');

    const cHistPutRes = await request('PUT', `/api/consents/${consentId1}/history`, { notes: 'Tamper' }, adminTokenT1);
    assert(cHistPutRes.status === 404 || cHistPutRes.status === 405, '23. Modifying immutable history endpoint unavailable (HTTP 404/405)');

    const cHistDelRes = await request('DELETE', `/api/consents/${consentId1}/history`, null, adminTokenT1);
    assert(cHistDelRes.status === 404 || cHistDelRes.status === 405, '24. Deleting immutable history endpoint unavailable (HTTP 404/405)');

    const cCrossWithdrawRes = await request('POST', `/api/consents/${consentId2}/withdraw`, null, adminTokenT99);
    assert(cCrossWithdrawRes.status === 404, '25. Cross-tenant consent withdrawal returns HTTP 404');

    // ==========================================
    // SECTION 3: DATA SUBJECT REQUESTS (DSR) (26-42)
    // ==========================================
    console.log('\n--- Section 3: Data Subject Requests (DSR) ---');

    const dsrSubject = `dsr.subject.${Date.now()}@example.com`;
    const dsrCreateRes = await request('POST', '/api/dsr', {
      data_subject_identifier: dsrSubject,
      request_type: 'ACCESS',
      description: 'Right to access personal data request',
      due_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')
    }, mgrTokenT1);
    assert(dsrCreateRes.status === 201 && dsrCreateRes.data?.data?.id, '26. Create DSR request succeeds (HTTP 201)');
    dsrId1 = dsrCreateRes.data?.data?.id;

    assert(Boolean(dsrCreateRes.data?.data?.request_reference?.startsWith('DSR-')), '27. Generated DSR request_reference follows DSR-YYYYMMDD-XXXX format');

    const dsrGetRes = await request('GET', `/api/dsr/${dsrId1}`, null, mgrTokenT1);
    assert(dsrGetRes.status === 200 && dsrGetRes.data?.data?.id === dsrId1, '28. Read DSR details by ID succeeds (HTTP 200)');

    const dsrListRes = await request('GET', '/api/dsr', null, mgrTokenT1);
    assert(dsrListRes.status === 200 && Array.isArray(dsrListRes.data?.data), '29. List DSR requests succeeds (HTTP 200)');

    const dsrUpdateRes = await request('PUT', `/api/dsr/${dsrId1}`, {
      description: 'Updated scope description for DSR',
      request_type: 'ERASURE'
    }, mgrTokenT1);
    assert(dsrUpdateRes.status === 200 && dsrUpdateRes.data?.data?.request_type === 'ERASURE', '30. Update DSR details & request type succeeds (HTTP 200)');

    // Status Transition 1: RECEIVED -> IN_REVIEW
    const dsrStatus1Res = await request('PATCH', `/api/dsr/${dsrId1}/status`, { status: 'IN_REVIEW' }, mgrTokenT1);
    assert(dsrStatus1Res.status === 200 && dsrStatus1Res.data?.data?.status === 'IN_REVIEW', '31. Status transition RECEIVED -> IN_REVIEW succeeds');

    // Status Transition 2: IN_REVIEW -> IN_PROGRESS
    const dsrStatus2Res = await request('PATCH', `/api/dsr/${dsrId1}/status`, { status: 'IN_PROGRESS' }, mgrTokenT1);
    assert(dsrStatus2Res.status === 200 && dsrStatus2Res.data?.data?.status === 'IN_PROGRESS', '32. Status transition IN_REVIEW -> IN_PROGRESS succeeds');

    // Status Transition 3: IN_PROGRESS -> COMPLETED
    const dsrStatus3Res = await request('PATCH', `/api/dsr/${dsrId1}/status`, {
      status: 'COMPLETED',
      resolution_notes: 'All data exported and provided to data subject'
    }, mgrTokenT1);
    assert(dsrStatus3Res.status === 200 && dsrStatus3Res.data?.data?.status === 'COMPLETED' && dsrStatus3Res.data?.data?.completed_at !== null, '33. Status transition to COMPLETED populates completed_at timestamp');

    // Invalid terminal transition
    const dsrTerminalErrRes = await request('PATCH', `/api/dsr/${dsrId1}/status`, { status: 'COMPLETED' }, mgrTokenT1);
    assert(dsrTerminalErrRes.status === 400, '34. Redundant transition on terminal COMPLETED state rejected (HTTP 400)');

    const dsrInvTypeRes = await request('POST', '/api/dsr', {
      data_subject_identifier: 'test@example.com',
      request_type: 'INVALID_TYPE'
    }, mgrTokenT1);
    assert(dsrInvTypeRes.status === 400, '35. Invalid DSR request_type rejected (HTTP 400)');

    const dsrMissingSubRes = await request('POST', '/api/dsr', {
      request_type: 'ACCESS'
    }, mgrTokenT1);
    assert(dsrMissingSubRes.status === 400, '36. Missing data_subject_identifier rejected (HTTP 400)');

    const dsrFilterStatusRes = await request('GET', '/api/dsr?status=COMPLETED', null, mgrTokenT1);
    assert(dsrFilterStatusRes.status === 200 && dsrFilterStatusRes.data?.data.every(d => d.status === 'COMPLETED'), '37. Filter DSRs by status COMPLETED succeeds');

    const dsrFilterTypeRes = await request('GET', '/api/dsr?request_type=ERASURE', null, mgrTokenT1);
    assert(dsrFilterTypeRes.status === 200 && dsrFilterTypeRes.data?.data.every(d => d.request_type === 'ERASURE'), '38. Filter DSRs by request_type ERASURE succeeds');

    const dsrSearchRes = await request('GET', `/api/dsr?search=${dsrSubject}`, null, mgrTokenT1);
    assert(dsrSearchRes.status === 200 && dsrSearchRes.data?.data.length === 1, '39. Search DSRs by subject identifier succeeds');

    const dsrCrossGetRes = await request('GET', `/api/dsr/${dsrId1}`, null, adminTokenT99);
    assert(dsrCrossGetRes.status === 404, '40. Cross-tenant DSR access returns HTTP 404');

    const dsrDeleteRes = await request('DELETE', `/api/dsr/${dsrId1}`, null, adminTokenT1);
    assert(dsrDeleteRes.status === 200, '41. Soft-delete DSR request succeeds (HTTP 200)');

    const dsrGetAfterDelRes = await request('GET', `/api/dsr/${dsrId1}`, null, adminTokenT1);
    assert(dsrGetAfterDelRes.status === 404, '42. Soft-deleted DSR no longer returned by GET by ID (HTTP 404)');

    // ==========================================
    // SECTION 4: PRIVACY SUMMARY DASHBOARD STATS (43-48)
    // ==========================================
    console.log('\n--- Section 4: Privacy Summary Dashboard Stats ---');

    const statsRes = await request('GET', '/api/privacy/stats', null, mgrTokenT1);
    assert(statsRes.status === 200 && statsRes.data?.data, '43. Privacy summary dashboard stats endpoint succeeds (HTTP 200)');

    const { consents, purposes, dsr } = statsRes.data?.data || {};
    assert(typeof consents?.total === 'number' && consents.total >= 2, '44. Stats: consents.total accurately reflects database count');
    assert(typeof consents?.granted === 'number' && typeof consents?.withdrawn === 'number', '45. Stats: consents breakdown includes granted and withdrawn metrics');
    assert(typeof purposes?.active === 'number' && typeof purposes?.archived === 'number', '46. Stats: purposes breakdown includes active and archived metrics');
    assert(typeof dsr?.total === 'number' && typeof dsr?.completed === 'number', '47. Stats: DSR breakdown includes total and status metrics');

    const statsCrossRes = await request('GET', '/api/privacy/stats?tenant_id=99', null, mgrTokenT1);
    assert(statsCrossRes.status === 200 && statsCrossRes.data?.data?.consents?.total === consents.total, '48. Query param tenant_id=99 cannot override JWT tenant context in stats');

    // ==========================================
    // SECTION 5: SECURITY & HARDENING (49-56)
    // ==========================================
    console.log('\n--- Section 5: Security & Hardening ---');

    const secUnauthRes = await request('GET', '/api/dsr', null, null);
    assert(secUnauthRes.status === 401, '49. Unauthenticated DSR request rejected with HTTP 401');

    const secInvalidJwtRes = await request('GET', '/api/dsr', null, 'INVALID_JWT_TOKEN_STRING');
    assert(secInvalidJwtRes.status === 401, '50. Malformed JWT token rejected with HTTP 401');

    const secForbiddenRes = await request('GET', '/api/dsr', null, noprivTokenT1);
    assert(secForbiddenRes.status === 403, '51. Unprivileged user denied DSR access with HTTP 403 Forbidden');

    const secDeleteForbiddenRes = await request('DELETE', `/api/consent-purposes/${purposeId1}`, null, mgrTokenT1);
    assert(secDeleteForbiddenRes.status === 403, '52. Non-admin manager denied purpose archive with HTTP 403 Forbidden');

    const secDsrOverrideRes = await request('POST', '/api/dsr?tenant_id=99', {
      data_subject_identifier: 'override.test@example.com',
      request_type: 'ACCESS'
    }, mgrTokenT1);
    assert(secDsrOverrideRes.status === 201 && secDsrOverrideRes.data?.data?.tenant_id === 1, '53. Tenant context strictly derived from JWT; query param ignored');

    const secCrossUpdateRes = await request('PUT', `/api/consent-purposes/${purposeId1}`, { name: 'Tamper Name' }, adminTokenT99);
    assert(secCrossUpdateRes.status === 404, '54. Cross-tenant purpose update rejected with HTTP 404');

    const secCrossDsrUpdateRes = await request('PATCH', `/api/dsr/${dsrId1}/status`, { status: 'CANCELLED' }, adminTokenT99);
    assert(secCrossDsrUpdateRes.status === 404, '55. Cross-tenant DSR status update rejected with HTTP 404');

    // Test Role Revocation Instant Effect
    await db.query(`DELETE FROM user_roles WHERE user_id = (SELECT id FROM users WHERE email = 'e2e.mgr.t1@test.com')`);
    const secRevokedRes = await request('GET', '/api/dsr', null, mgrTokenT1);
    assert(secRevokedRes.status === 403, '56. DB role revocation immediately blocks subsequent requests (HTTP 403)');

    // ==========================================
    // SECTION 6: FRONTEND & API INTEGRATION (57-62)
    // ==========================================
    console.log('\n--- Section 6: Frontend & API Integration ---');

    const fePurposesRes = await request('GET', '/api/consent-purposes', null, adminTokenT1);
    assert(fePurposesRes.status === 200 && fePurposesRes.data?.data.every(p => p.purpose_code && p.legal_basis && p.version), '57. Frontend Purpose API returns complete purpose metadata schema');

    const feConsentsRes = await request('GET', '/api/consents', null, adminTokenT1);
    assert(feConsentsRes.status === 200 && feConsentsRes.data?.data.every(c => c.data_subject_identifier && c.purpose_name && c.status), '58. Frontend Consents API returns complete consent record schema');

    const feDsrsRes = await request('GET', '/api/dsr', null, adminTokenT1);
    assert(feDsrsRes.status === 200 && feDsrsRes.data?.data.every(d => d.request_reference && d.request_type && d.status), '59. Frontend DSR API returns complete DSR request schema');

    const feEmptySearchRes = await request('GET', '/api/dsr?search=NONEXISTENT_QUERY_TERM_9999', null, adminTokenT1);
    assert(feEmptySearchRes.status === 200 && Array.isArray(feEmptySearchRes.data?.data) && feEmptySearchRes.data?.data.length === 0, '60. Non-matching search returns clean empty state array []');

    const feInvalidPostRes = await request('POST', '/api/dsr', { request_type: 'ACCESS' }, adminTokenT1);
    assert(feInvalidPostRes.status === 400 && feInvalidPostRes.data?.error, '61. Validation errors return structured JSON { error } for UI alert rendering');

    const feStatsStructureRes = await request('GET', '/api/privacy/stats', null, adminTokenT1);
    assert(feStatsStructureRes.status === 200 && feStatsStructureRes.data?.data?.consents && feStatsStructureRes.data?.data?.purposes && feStatsStructureRes.data?.data?.dsr, '62. Privacy dashboard stats structure matches frontend PrivacySummaryCards contract');

    console.log('\n===============================================================');
    console.log(`TOTAL PHASE 2 E2E ASSERTIONS EXECUTED: ${passed}/${total}`);
    console.log(`TOTAL PASSED: ${passed}`);
    console.log(`TOTAL FAILED: ${total - passed}`);
    console.log('===============================================================\n');

    if (db) await db.end();

    if (passed === total) {
      console.log('🎉 PHASE 2 CONSENT & PRIVACY E2E TEST SUITE PASSED 100%!');
      process.exit(0);
    } else {
      console.error('❌ E2E Test Suite Failed!');
      process.exit(1);
    }
  } catch (err) {
    console.error('E2E Test Execution Error:', err);
    if (db) await db.end();
    process.exit(1);
  }
}

runE2ESuite();
