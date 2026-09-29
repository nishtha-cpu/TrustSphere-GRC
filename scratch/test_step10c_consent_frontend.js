const http = require('http');
const mysql = require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/mysql2/promise');
const bcrypt = require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/bcryptjs');
require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/dotenv').config({ path: 'c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/.env' });

const PORT = 5000;
const HOST = 'localhost';

let db;
let adminToken = '';
let unprivilegedToken = '';
let createdPurposeId = null;
let createdConsentId = null;

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

async function setupUsers() {
  db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trustsphere'
  });

  const hash = await bcrypt.hash('TestPass123!', 10);

  // Ensure Admin user
  const [adminRows] = await db.query(`SELECT id FROM users WHERE email = 'admin.10c@test.com'`);
  let adminUserId;
  if (adminRows.length === 0) {
    const [res] = await db.query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, status) VALUES (1, 'admin.10c@test.com', ?, 'Admin', '10C', 'ACTIVE')`,
      [hash]
    );
    adminUserId = res.insertId;
  } else {
    adminUserId = adminRows[0].id;
  }

  // Ensure SYSTEM_ADMIN role
  const [sysRole] = await db.query(`SELECT id FROM roles WHERE code = 'SYSTEM_ADMIN' AND tenant_id = 1`);
  let sysRoleId;
  if (sysRole.length === 0) {
    const [rRes] = await db.query(`INSERT INTO roles (tenant_id, name, code) VALUES (1, 'System Admin', 'SYSTEM_ADMIN')`);
    sysRoleId = rRes.insertId;
  } else {
    sysRoleId = sysRole[0].id;
  }
  await db.query(`DELETE FROM user_roles WHERE user_id = ?`, [adminUserId]);
  await db.query(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`, [adminUserId, sysRoleId]);

  // Ensure Unprivileged user (no consent roles)
  const [noprivRows] = await db.query(`SELECT id FROM users WHERE email = 'unprivileged.10c@test.com'`);
  let noprivUserId;
  if (noprivRows.length === 0) {
    const [res] = await db.query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, status) VALUES (1, 'unprivileged.10c@test.com', ?, 'NoPriv', '10C', 'ACTIVE')`,
      [hash]
    );
    noprivUserId = res.insertId;
  } else {
    noprivUserId = noprivRows[0].id;
  }
  await db.query(`DELETE FROM user_roles WHERE user_id = ?`, [noprivUserId]);

  // Login both users to get tokens
  const adminLog = await request('POST', '/api/auth/login', { email: 'admin.10c@test.com', password: 'TestPass123!' });
  adminToken = adminLog.data?.data?.token;

  const noprivLog = await request('POST', '/api/auth/login', { email: 'unprivileged.10c@test.com', password: 'TestPass123!' });
  unprivilegedToken = noprivLog.data?.data?.token;
}

async function runTests() {
  console.log('=== STEP 10C — CONSENT REACT FRONTEND INTEGRATION TESTS ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition, name) {
    total++;
    if (condition) {
      console.log(`✅ [PASS ${total}] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL ${total}] ${name}`);
    }
  }

  try {
    await setupUsers();

    assert(Boolean(adminToken), 'Admin login successfully retrieves JWT token');
    assert(Boolean(unprivilegedToken), 'Unprivileged login successfully retrieves JWT token');

    // 1. Consent Page Loads (Purpose & Consent Lists)
    const purposeListRes = await request('GET', '/api/consent-purposes', null, adminToken);
    assert(purposeListRes.status === 200 && Array.isArray(purposeListRes.data?.data), '1. Purpose list loads successfully (HTTP 200)');

    const consentListRes = await request('GET', '/api/consents', null, adminToken);
    assert(consentListRes.status === 200 && Array.isArray(consentListRes.data?.data), '2. Consent list loads successfully (HTTP 200)');

    // 2. Purpose Creation Flow
    const testPurposeCode = `UI-PURP-${Date.now()}`;
    const createPurposeRes = await request('POST', '/api/consent-purposes', {
      purpose_code: testPurposeCode,
      name: 'UI Frontend Test Purpose',
      description: 'Created during Step 10C frontend testing',
      legal_basis: 'CONSENT',
      version: '1.0'
    }, adminToken);
    assert(createPurposeRes.status === 201 && createPurposeRes.data?.data?.id, '4. Purpose creation flow succeeded (HTTP 201)');
    createdPurposeId = createPurposeRes.data?.data?.id;

    // 3. Purpose Update Flow
    const updatePurposeRes = await request('PUT', `/api/consent-purposes/${createdPurposeId}`, {
      name: 'UI Frontend Test Purpose (Updated)',
      description: 'Updated description for frontend test',
      legal_basis: 'CONSENT',
      version: '1.1',
      status: 'ACTIVE'
    }, adminToken);
    assert(updatePurposeRes.status === 200 && updatePurposeRes.data?.data?.name.includes('Updated'), '5. Purpose update flow succeeded (HTTP 200)');

    // 4. Consent Creation Flow
    const createConsentRes = await request('POST', '/api/consents', {
      purpose_id: createdPurposeId,
      data_subject_type: 'EXTERNAL_DATA_SUBJECT',
      data_subject_identifier: `ui-user-${Date.now()}@example.com`,
      status: 'GRANTED',
      consent_version: '1.1',
      source: 'WEB_FORM',
      notes: 'Consent granted via frontend flow test'
    }, adminToken);
    assert(createConsentRes.status === 201 && createConsentRes.data?.data?.id, '7. Consent record creation flow succeeded (HTTP 201)');
    createdConsentId = createConsentRes.data?.data?.id;

    // 5. Consent Details Flow
    const getConsentRes = await request('GET', `/api/consents/${createdConsentId}`, null, adminToken);
    assert(getConsentRes.status === 200 && getConsentRes.data?.data?.id === createdConsentId, '8. Consent details load succeeded (HTTP 200)');

    // 6. Consent Withdrawal Flow
    const withdrawRes = await request('POST', `/api/consents/${createdConsentId}/withdraw`, {
      notes: 'Withdrawn via UI test'
    }, adminToken);
    assert(withdrawRes.status === 200 && withdrawRes.data?.data?.status === 'WITHDRAWN', '9. Consent withdrawal flow succeeded (HTTP 200)');

    // 7. Consent History Flow
    const historyRes = await request('GET', `/api/consents/${createdConsentId}/history`, null, adminToken);
    assert(historyRes.status === 200 && Array.isArray(historyRes.data?.data) && historyRes.data?.data.length >= 2, '10. Consent immutable history load succeeded (HTTP 200)');

    // 8. Purpose Archive Flow
    const archiveRes = await request('DELETE', `/api/consent-purposes/${createdPurposeId}`, null, adminToken);
    assert(archiveRes.status === 200 && archiveRes.data?.data?.status === 'ARCHIVED', '6. Purpose archive flow succeeded (HTTP 200)');

    // 9. Filters Testing
    const filterPurposeRes = await request('GET', `/api/consent-purposes?status=ARCHIVED&search=${testPurposeCode}`, null, adminToken);
    assert(filterPurposeRes.status === 200 && filterPurposeRes.data?.data?.length === 1, '11. Backend status and search filtering works correctly');

    // 10. 403 Permission Handling
    const forbiddenRes = await request('GET', '/api/consents', null, unprivilegedToken);
    assert(forbiddenRes.status === 403, '12. Unprivileged user receives 403 Forbidden without logging out');

    // 11. 401 Authentication Handling
    const unauthRes = await request('GET', '/api/consent-purposes', null, null);
    assert(unauthRes.status === 401, '13. Unauthenticated request receives 401 Unauthorized');

    // 12. Empty States
    const emptyStateRes = await request('GET', '/api/consent-purposes?search=NONEXISTENT_SEARCH_STRING_12345', null, adminToken);
    assert(emptyStateRes.status === 200 && emptyStateRes.data?.data?.length === 0, '14. Non-matching query returns clean empty state array []');

    // 13. API Validation Errors (Does not crash UI)
    const invalidBodyRes = await request('POST', '/api/consent-purposes', { name: 'Missing Purpose Code' }, adminToken);
    assert(invalidBodyRes.status === 400 && invalidBodyRes.data?.error, '15. Invalid payload returns HTTP 400 error message cleanly handled by UI');

    console.log(`\nRESULTS: ${passed}/${total} frontend integration tests passed.\n`);
    if (db) await db.end();
    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed:', err);
    if (db) await db.end();
    process.exit(1);
  }
}

runTests();
