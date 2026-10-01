const http = require('http');
const mysql = require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/mysql2/promise');
const bcrypt = require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/bcryptjs');
require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/dotenv').config({ path: 'c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/.env' });

const BASE_URL = 'http://localhost:5000';

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const contentType = res.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } else {
            resolve({ status: res.statusCode, body: data });
          }
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== CONSENT MANAGEMENT COMPLETION E2E TEST SUITE ===\n');
  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, description) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${description}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${description}`);
    }
  }

  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'trustsphere'
    });

    const passHash = await bcrypt.hash('TestPass123!', 10);

    // Ensure Tenant 1
    const [t1] = await db.query(`SELECT id FROM tenants WHERE id = 1`);
    if (t1.length === 0) await db.query(`INSERT INTO tenants (id, name, slug, status) VALUES (1, 'Acme Corp', 'acme-corp', 'ACTIVE')`);

    // Ensure Admin Role
    const [existingRole] = await db.query(`SELECT id FROM roles WHERE code = 'SYSTEM_ADMIN' AND tenant_id = 1`);
    let roleId;
    if (existingRole.length === 0) {
      const [res] = await db.query(`INSERT INTO roles (tenant_id, name, code) VALUES (1, 'System Admin', 'SYSTEM_ADMIN')`);
      roleId = res.insertId;
    } else {
      roleId = existingRole[0].id;
    }

    // Ensure Admin User
    const [existingAdmin] = await db.query(`SELECT id FROM users WHERE email = 'admin@trustsphere.com'`);
    let adminUserId;
    if (existingAdmin.length === 0) {
      const [res] = await db.query(`INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, status) VALUES (1, 'admin@trustsphere.com', ?, 'Admin', 'User', 'ACTIVE')`, [passHash]);
      adminUserId = res.insertId;
    } else {
      adminUserId = existingAdmin[0].id;
      await db.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passHash, adminUserId]);
    }
    await db.query(`DELETE FROM user_roles WHERE user_id = ?`, [adminUserId]);
    await db.query(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`, [adminUserId, roleId]);

    // Ensure User 1 & User 2
    const ensureUser = async (email, firstName) => {
      const [ex] = await db.query(`SELECT id FROM users WHERE email = ?`, [email]);
      if (ex.length === 0) {
        await db.query(`INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, status) VALUES (1, ?, ?, ?, 'Principal', 'ACTIVE')`, [email, passHash, firstName]);
      } else {
        await db.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passHash, ex[0].id]);
      }
    };
    await ensureUser('user1@example.com', 'UserOne');
    await ensureUser('user2@example.com', 'UserTwo');

    // 1. Authenticate Admin User
    console.log('1. Authenticating Admin user...');
    const adminAuthRes = await makeRequest('/api/auth/login', 'POST', {
      email: 'admin@trustsphere.com',
      password: 'TestPass123!'
    });
    const adminToken = adminAuthRes.body?.data?.token;
    assert(adminAuthRes.status === 200 && adminToken, 'Admin login successful');

    // 2. Authenticate End-User 1 (user1@example.com)
    console.log('\n2. Authenticating End-User 1 (user1@example.com)...');
    const user1AuthRes = await makeRequest('/api/auth/login', 'POST', {
      email: 'user1@example.com',
      password: 'TestPass123!'
    });
    const user1Token = user1AuthRes.body?.data?.token;
    assert(user1AuthRes.status === 200 && user1Token, 'User 1 login successful');

    // 3. Authenticate End-User 2 (user2@example.com)
    console.log('\n3. Authenticating End-User 2 (user2@example.com)...');
    const user2AuthRes = await makeRequest('/api/auth/login', 'POST', {
      email: 'user2@example.com',
      password: 'TestPass123!'
    });
    const user2Token = user2AuthRes.body?.data?.token;
    assert(user2AuthRes.status === 200 && user2Token, 'User 2 login successful');

    // 4. Create Purpose for Consent Lifecycle Testing
    console.log('\n4. Creating Consent Processing Purpose...');
    const purposeCode = `PURP_${Date.now()}`;
    const createPurpRes = await makeRequest('/api/consent-purposes', 'POST', {
      purpose_code: purposeCode,
      name: 'E2E Testing Purpose',
      description: 'Purpose used for BRD Consent lifecycle E2E testing',
      legal_basis: 'CONSENT',
      data_categories: ['Contact Details', 'Usage Logs'],
      retention_period_days: 180,
      is_mandatory: false
    }, adminToken);
    assert(createPurpRes.status === 201 && createPurpRes.body?.data?.id, `Created purpose ${purposeCode}`);
    const purposeId = createPurpRes.body?.data?.id;

    // 5. Create Consent Records with all BRD Channels
    console.log('\n5. Creating Consent Records across all BRD Channels...');
    const channels = ['WEB_FORM', 'MOBILE_APP', 'CUSTOMER_PORTAL', 'API', 'CRM', 'WEB_PORTAL'];
    const createdConsents = [];

    for (const ch of channels) {
      const createConsentRes = await makeRequest('/api/consents', 'POST', {
        purpose_id: purposeId,
        data_subject_type: 'CUSTOMER',
        data_subject_identifier: 'user1@example.com',
        consent_status: 'GRANTED',
        source: ch,
        notice_version: 'v2.1',
        valid_until: new Date(Date.now() + 30 * 86400 * 1000).toISOString()
      }, adminToken);
      assert(createConsentRes.status === 201 && createConsentRes.body?.data?.source === ch, `Created consent via channel: ${ch}`);
      if (createConsentRes.body?.data) createdConsents.push(createConsentRes.body.data);
    }

    // 6. Test Preference Center Endpoints for User 1
    console.log('\n6. Testing Preference Center APIs for User 1 (user1@example.com)...');
    
    // GET Preferences (returns array of preferences)
    const getPrefRes = await makeRequest('/api/preference-center/my-preferences', 'GET', null, user1Token);
    assert(getPrefRes.status === 200 && Array.isArray(getPrefRes.body?.data), 'User 1 retrieved my-preferences');
    
    const prefForTestPurp = getPrefRes.body?.data?.find(p => p.purpose_id === purposeId);
    assert(prefForTestPurp && prefForTestPurp.status === 'GRANTED', 'User 1 sees GRANTED consent for purpose in preference center');

    // POST Update Preferences (Toggle to WITHDRAWN)
    console.log('\n7. Testing Preference Center Withdrawal (Update Preference)...');
    const updatePrefRes = await makeRequest('/api/preference-center/my-preferences', 'POST', {
      preferences: [
        { purpose_id: purposeId, status: 'WITHDRAWN' }
      ]
    }, user1Token);
    assert(updatePrefRes.status === 200, 'User 1 successfully updated preference to WITHDRAWN');

    // Verify history recorded in my-history
    const getHistRes = await makeRequest('/api/preference-center/my-history', 'GET', null, user1Token);
    assert(getHistRes.status === 200 && getHistRes.body?.data?.some(h => h.action === 'CONSENT_WITHDRAWN'), 'User 1 sees CONSENT_WITHDRAWN in my-history');

    // 8. Download Consent Records
    console.log('\n8. Testing Preference Center Download Records...');
    const downloadJsonRes = await makeRequest('/api/preference-center/download?format=json', 'GET', null, user1Token);
    const parsedJsonDownload = typeof downloadJsonRes.body === 'string' ? JSON.parse(downloadJsonRes.body) : downloadJsonRes.body;
    assert(downloadJsonRes.status === 200 && parsedJsonDownload.data_principal === 'user1@example.com', 'User 1 downloaded consent records in JSON');

    const downloadCsvRes = await makeRequest('/api/preference-center/download?format=csv', 'GET', null, user1Token);
    assert(downloadCsvRes.status === 200 && typeof downloadCsvRes.body === 'string' && downloadCsvRes.body.includes('Purpose Code'), 'User 1 downloaded consent records in CSV');

    // 9. Authorization & Isolation Checks: User 2 cannot access or download User 1's records
    console.log('\n9. Testing Tenant & User Isolation for Download...');
    const user2DownloadRes = await makeRequest('/api/preference-center/download?format=json', 'GET', null, user2Token);
    const parsedUser2Download = typeof user2DownloadRes.body === 'string' ? JSON.parse(user2DownloadRes.body) : user2DownloadRes.body;
    assert(user2DownloadRes.status === 200 && parsedUser2Download.data_principal === 'user2@example.com' && parsedUser2Download.active_preferences.every(p => p.status === 'NOT_PROVIDED'), 'User 2 cannot see User 1 consent records in download');

    // 10. Consent Renewal Workflow
    console.log('\n10. Testing Consent Renewal Workflow...');
    // Create an explicit active consent record for renewal testing
    const consentForRenewalRes = await makeRequest('/api/consents', 'POST', {
      purpose_id: purposeId,
      data_subject_type: 'CUSTOMER',
      data_subject_identifier: 'user1@example.com',
      consent_status: 'GRANTED',
      source: 'WEB_FORM',
      valid_until: new Date(Date.now() + 10 * 86400 * 1000).toISOString()
    }, adminToken);
    assert(consentForRenewalRes.status === 201 && consentForRenewalRes.body?.data?.id, 'Created consent record for renewal test');
    const renewalConsentId = consentForRenewalRes.body?.data?.id;

    const newValidUntil = new Date(Date.now() + 365 * 86400 * 1000).toISOString();
    const renewRes = await makeRequest(`/api/consents/${renewalConsentId}/renew`, 'POST', {
      valid_until: newValidUntil,
      notes: 'Renewed for 1 year'
    }, adminToken);
    assert(renewRes.status === 200 && renewRes.body?.data?.consent_status === 'GRANTED', 'Consent successfully renewed');

    // Verify history contains CONSENT_RENEWED
    const historyRes = await makeRequest(`/api/consents/${renewalConsentId}/history`, 'GET', null, adminToken);
    assert(historyRes.status === 200 && historyRes.body?.data?.some(h => h.action === 'CONSENT_RENEWED'), 'Consent audit history contains CONSENT_RENEWED event');

    // 11. Expiry Handling Test
    console.log('\n11. Testing Expiry Monitoring & Handling...');
    // Create an expired consent record directly
    const expiredConsentRes = await makeRequest('/api/consents', 'POST', {
      purpose_id: purposeId,
      data_subject_type: 'CUSTOMER',
      data_subject_identifier: 'user1@example.com',
      consent_status: 'GRANTED',
      source: 'WEB_FORM',
      valid_until: new Date(Date.now() - 3600 * 1000).toISOString() // Valid until 1 hour ago
    }, adminToken);
    assert(expiredConsentRes.status === 201, 'Created consent record with past valid_until date');

    // Call analytics endpoint which automatically triggers checkAndMarkExpiredConsents
    const analyticsRes = await makeRequest('/api/consents/analytics/trends', 'GET', null, adminToken);
    assert(analyticsRes.status === 200 && analyticsRes.body?.data?.summary, 'Retrieved Consent Analytics & Trends');
    assert(analyticsRes.body?.data?.summary?.expired_consents >= 1, `Analytics reports ${analyticsRes.body?.data?.summary?.expired_consents} expired consent(s)`);

    // Verify that the record status is now EXPIRED
    const checkExpiredRecordRes = await makeRequest(`/api/consents/${expiredConsentRes.body?.data?.id}`, 'GET', null, adminToken);
    assert(checkExpiredRecordRes.status === 200 && checkExpiredRecordRes.body?.data?.consent_status === 'EXPIRED', 'Consent status updated to EXPIRED');

    // 12. Verification of Analytics Channels & Trends structure
    console.log('\n12. Verifying Analytics Channels and Trends payload...');
    assert(Array.isArray(analyticsRes.body?.data?.channels) && analyticsRes.body?.data?.channels.length > 0, 'Analytics includes channels breakdown');
    assert(Array.isArray(analyticsRes.body?.data?.trends) && analyticsRes.body?.data?.trends.length > 0, 'Analytics includes monthly trends breakdown');

    console.log(`\n==================================================`);
    console.log(`CONSENT COMPLETION E2E RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log(`==================================================\n`);

    await db.end();
    if (passedTests === totalTests) {
      process.exit(0);
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error('E2E Test Execution Error:', err);
    if (db) await db.end();
    process.exit(1);
  }
}

runTests();
