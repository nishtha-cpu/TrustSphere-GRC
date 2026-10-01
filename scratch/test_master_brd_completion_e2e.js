const http = require('http');
const mysql = require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/mysql2/promise');
const bcrypt = require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/bcryptjs');
require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/dotenv').config({ path: 'c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/.env' });

const BASE_URL = 'http://localhost:5000';

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

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
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('=== MASTER BRD COMPLETION E2E TEST SUITE ===\n');
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

    // 1. Authenticate Admin User
    console.log('1. Authenticating Admin User...');
    const passHash = await bcrypt.hash('TestPass123!', 10);
    const [existingAdmin] = await db.query(`SELECT id FROM users WHERE email = 'admin@trustsphere.com'`);
    if (existingAdmin.length > 0) {
      await db.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passHash, existingAdmin[0].id]);
    }
    const adminAuthRes = await makeRequest('/api/auth/login', 'POST', {
      email: 'admin@trustsphere.com',
      password: 'TestPass123!'
    });
    const adminToken = adminAuthRes.body?.data?.token;
    assert(adminAuthRes.status === 200 && adminToken, 'Admin login successful');

    // 2. PHASE 1: Privacy Impact Assessment (DPIA)
    console.log('\n2. Testing Phase 1: Privacy Impact Assessment (DPIA)...');
    const createDPIARes = await makeRequest('/api/dpia', 'POST', {
      title: 'E2E DPIA Assessment',
      description: 'Privacy impact analysis for new payment processing gateway',
      data_collection_score: 80,
      data_processing_score: 70,
      data_sharing_score: 75,
      data_retention_score: 60,
      security_controls_score: 65,
      executive_summary: 'High impact on sensitive financial data'
    }, adminToken);
    assert(createDPIARes.status === 201 && createDPIARes.body?.data?.id, 'Created DPIA assessment');
    const dpiaId = createDPIARes.body?.data?.id;
    assert(createDPIARes.body?.data?.overall_risk_score === 70, 'Calculated overall DPIA risk score correctly (70)');
    assert(createDPIARes.body?.data?.risk_level === 'HIGH', 'Calculated DPIA risk level correctly (HIGH)');

    // Workflow status transitions
    const submitReviewRes = await makeRequest(`/api/dpia/${dpiaId}/status`, 'PUT', { status: 'IN_REVIEW' }, adminToken);
    assert(submitReviewRes.status === 200 && submitReviewRes.body?.data?.status === 'IN_REVIEW', 'Submitted DPIA for IN_REVIEW');

    const approveDPIARes = await makeRequest(`/api/dpia/${dpiaId}/status`, 'PUT', { status: 'APPROVED', reviewer_notes: 'All privacy controls passed' }, adminToken);
    assert(approveDPIARes.status === 200 && approveDPIARes.body?.data?.status === 'APPROVED', 'Approved DPIA assessment');

    // Add remediation
    const addRemRes = await makeRequest(`/api/dpia/${dpiaId}/remediations`, 'POST', {
      risk_item: 'Unencrypted backup retention',
      action_plan: 'Enable KMS encryption on backup buckets',
      target_date: '2026-11-01'
    }, adminToken);
    assert(addRemRes.status === 201 && addRemRes.body?.data?.id, 'Added DPIA remediation item');

    // 3. PHASE 2: Cookie Management
    console.log('\n3. Testing Phase 2: Cookie Discovery & Management...');
    const addCookieRes = await makeRequest('/api/cookies/inventory', 'POST', {
      name: '_ga_test',
      domain: '.trustsphere.com',
      provider: 'Google Analytics',
      party_type: 'THIRD_PARTY',
      category: 'ANALYTICS',
      duration: '2 Years',
      description: 'Used to distinguish users for traffic analytics'
    }, adminToken);
    assert(addCookieRes.status === 201 && addCookieRes.body?.data?.id, 'Added cookie to inventory');

    // Banner consent submission (with admin token)
    const bannerConsentRes = await makeRequest('/api/cookies/consent', 'POST', {
      session_identifier: `SESS_${Date.now()}`,
      essential_accepted: true,
      analytics_accepted: true,
      advertising_accepted: false
    }, adminToken);
    assert(bannerConsentRes.status === 201 && bannerConsentRes.body?.data?.id, 'Recorded cookie banner consent');

    // Cookie analytics
    const cookieAnalyticsRes = await makeRequest('/api/cookies/analytics', 'GET', null, adminToken);
    assert(cookieAnalyticsRes.status === 200 && cookieAnalyticsRes.body?.data?.total_cookies >= 1, 'Retrieved cookie compliance analytics');

    // 4. PHASE 3: Privacy Governance / RoPA
    console.log('\n4. Testing Phase 3: Records of Processing Activities (RoPA)...');
    const createRoPARes = await makeRequest('/api/ropa', 'POST', {
      activity_name: 'Customer Order Fulfillment',
      purpose_description: 'Processing customer shipping address and payment details for order fulfillment',
      data_subject_categories: 'Customers',
      personal_data_categories: 'Full Name, Shipping Address, Credit Card Hash',
      legal_basis: 'CONTRACT',
      retention_period: '7 Years for tax compliance',
      controller_name: 'Acme Corp Commerce Division'
    }, adminToken);
    assert(createRoPARes.status === 201 && createRoPARes.body?.data?.id, 'Created RoPA record');
    const ropaId = createRoPARes.body?.data?.id;

    const listRoPARes = await makeRequest('/api/ropa', 'GET', null, adminToken);
    assert(listRoPARes.status === 200 && listRoPARes.body?.data?.some(r => r.id === ropaId), 'Listed RoPA records containing newly created record');

    // 5. PHASE 4: Data Asset Inventory & Data Flows
    console.log('\n5. Testing Phase 4: Data Inventory & Data Mapping...');
    const addAssetRes = await makeRequest('/api/data-inventory/assets', 'POST', {
      asset_name: 'Customer DB Postgres Cluster',
      asset_type: 'RELATIONAL_DATABASE',
      system_source: 'AWS RDS',
      data_categories: 'Customer PII, Order History',
      sensitivity_level: 'CONFIDENTIAL',
      location: 'AWS us-east-1',
      retention_policy: '7 Years'
    }, adminToken);
    assert(addAssetRes.status === 201 && addAssetRes.body?.data?.id, 'Registered data asset');
    const assetId = addAssetRes.body?.data?.id;

    const addFlowRes = await makeRequest('/api/data-inventory/flows', 'POST', {
      flow_name: 'Postgres to Analytics Warehouse Stream',
      source_asset_id: assetId,
      recipient_name: 'Snowflake Data Lake',
      transfer_mechanism: 'Kinesis Firehose Pipeline',
      encryption_status: 'TLS 1.3 in Transit, AES-256 at Rest'
    }, adminToken);
    assert(addFlowRes.status === 201 && addFlowRes.body?.data?.id, 'Added data flow connection');

    // 6. PHASE 5: Third-Party Risk Management (TPRM)
    console.log('\n6. Testing Phase 5: Third-Party Risk Management (TPRM)...');
    const createVendorRes = await makeRequest('/api/tprm/vendors', 'POST', {
      vendor_name: 'CloudCloud Hosting Solutions',
      vendor_type: 'CLOUD_PROVIDER',
      services_provided: 'Managed Kubernetes Cluster Infrastructure',
      data_handled: 'Application Logs, Customer Metadata',
      contact_email: 'security@cloudcloud.com'
    }, adminToken);
    assert(createVendorRes.status === 201 && createVendorRes.body?.data?.id, 'Registered third-party vendor');
    const vendorId = createVendorRes.body?.data?.id;

    // Weighted BRD Assessment
    const createTPRMAssessmentRes = await makeRequest(`/api/tprm/vendors/${vendorId}/assessments`, 'POST', {
      sensitivity_score: 80,
      compliance_exposure_score: 60,
      security_controls_score: 70,
      vendor_maturity_score: 60,
      incident_history_score: 90
    }, adminToken);
    assert(createTPRMAssessmentRes.status === 201 && createTPRMAssessmentRes.body?.data?.overall_risk_score === 72, 'Executed BRD weighted TPRM risk formula (Score 72)');
    assert(createTPRMAssessmentRes.body?.data?.risk_level === 'HIGH', 'Vendor risk level set to HIGH');

    // Add TPRM finding
    const addFindingRes = await makeRequest(`/api/tprm/vendors/${vendorId}/findings`, 'POST', {
      finding_title: 'SOC 2 Type II Report Expired',
      category: 'COMPLIANCE',
      severity: 'HIGH',
      remediation_plan: 'Request updated annual SOC 2 audit report'
    }, adminToken);
    assert(addFindingRes.status === 201 && addFindingRes.body?.data?.id, 'Recorded TPRM finding');

    // 7. PHASE 6: Privacy Incident Management
    console.log('\n7. Testing Phase 6: Privacy Incident Management...');
    const createIncidentRes = await makeRequest('/api/incidents', 'POST', {
      title: 'Unintended S3 Bucket Public Read Access',
      description: 'Misconfigured IAM policy exposed staging analytics logs for 3 hours',
      affected_data_categories: 'Application Usage Logs, Anonymized User IDs',
      affected_subjects_count: 50,
      severity: 'MEDIUM',
      classification: 'MISCONFIGURATION'
    }, adminToken);
    assert(createIncidentRes.status === 201 && createIncidentRes.body?.data?.id, 'Logged privacy incident');
    const incidentId = createIncidentRes.body?.data?.id;
    assert(createIncidentRes.body?.data?.status === 'IDENTIFICATION', 'Initial status is IDENTIFICATION');

    // Advance incident status to INVESTIGATION
    const updateIncRes = await makeRequest(`/api/incidents/${incidentId}/status`, 'PUT', {
      status: 'INVESTIGATION',
      investigation_notes: 'Confirmed S3 bucket policy updated and access revoked'
    }, adminToken);
    assert(updateIncRes.status === 200 && updateIncRes.body?.data?.status === 'INVESTIGATION', 'Advanced incident status to INVESTIGATION');

    // 8. PHASE 7: Executive Compliance Dashboard
    console.log('\n8. Testing Phase 7: Executive Compliance Dashboard...');
    const dashboardRes = await makeRequest('/api/dashboard/compliance-overview', 'GET', null, adminToken);
    assert(dashboardRes.status === 200 && dashboardRes.body?.data?.kpi, 'Retrieved Executive Compliance Dashboard KPIs');
    assert(typeof dashboardRes.body?.data?.kpi?.privacy_compliance_score === 'number', 'Calculated Privacy Compliance Score');
    assert(typeof dashboardRes.body?.data?.kpi?.dpdp_compliance_score === 'number', 'Calculated DPDP Compliance Readiness Score');

    console.log(`\n==================================================`);
    console.log(`MASTER BRD COMPLETION E2E RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
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
