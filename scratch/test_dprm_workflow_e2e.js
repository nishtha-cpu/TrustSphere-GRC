const mysql = require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/mysql2/promise');
const bcrypt = require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/bcryptjs');
const path = require('path');
require('c:/Users/CloudWire/Desktop/TrustSphere-GRC/backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const authService = require('../backend/services/authService');
const dsrService = require('../backend/services/dsrService');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASSED: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function setupTestUsers() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trustsphere'
  });

  const passHash = await bcrypt.hash('TestPass123!', 10);

  // Ensure Tenant 1
  const [t1] = await connection.query(`SELECT id FROM tenants WHERE id = 1`);
  if (t1.length === 0) {
    await connection.query(`INSERT IGNORE INTO tenants (id, name, slug, status) VALUES (1, 'Acme Corp', 'acme-corp-dprm', 'ACTIVE')`);
  }

  // Ensure Tenant 2
  const [t2] = await connection.query(`SELECT id FROM tenants WHERE id = 2`);
  if (t2.length === 0) {
    await connection.query(`INSERT IGNORE INTO tenants (id, name, slug, status) VALUES (2, 'Beta Corp', 'beta-corp-dprm', 'ACTIVE')`);
  }

  // Ensure Roles
  const [adminRole] = await connection.query(`SELECT id FROM roles WHERE code = 'SYSTEM_ADMIN' AND (tenant_id = 1 OR tenant_id IS NULL)`);
  let adminRoleId = adminRole.length ? adminRole[0].id : null;
  if (!adminRoleId) {
    const [res] = await connection.query(`INSERT INTO roles (tenant_id, name, code) VALUES (1, 'System Admin', 'SYSTEM_ADMIN')`);
    adminRoleId = res.insertId;
  }

  const [auditorRole] = await connection.query(`SELECT id FROM roles WHERE code = 'AUDITOR' AND (tenant_id = 1 OR tenant_id IS NULL)`);
  let auditorRoleId = auditorRole.length ? auditorRole[0].id : null;
  if (!auditorRoleId) {
    const [res] = await connection.query(`INSERT INTO roles (tenant_id, name, code) VALUES (1, 'Auditor', 'AUDITOR')`);
    auditorRoleId = res.insertId;
  }

  // Ensure Admin User (dprm.admin@test.com)
  const [uAdmin] = await connection.query(`SELECT id FROM users WHERE email = 'dprm.admin@test.com'`);
  let adminUserId;
  if (uAdmin.length === 0) {
    const [res] = await connection.query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, status) VALUES (1, 'dprm.admin@test.com', ?, 'DPRM', 'Admin', 'ACTIVE')`,
      [passHash]
    );
    adminUserId = res.insertId;
  } else {
    adminUserId = uAdmin[0].id;
    await connection.query(`UPDATE users SET status = 'ACTIVE', password_hash = ? WHERE id = ?`, [passHash, adminUserId]);
  }
  await connection.query(`DELETE FROM user_roles WHERE user_id = ?`, [adminUserId]);
  await connection.query(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`, [adminUserId, adminRoleId]);

  // Ensure Auditor User (dprm.auditor@test.com)
  const [uAuditor] = await connection.query(`SELECT id FROM users WHERE email = 'dprm.auditor@test.com'`);
  let auditorUserId;
  if (uAuditor.length === 0) {
    const [res] = await connection.query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, status) VALUES (1, 'dprm.auditor@test.com', ?, 'DPRM', 'Auditor', 'ACTIVE')`,
      [passHash]
    );
    auditorUserId = res.insertId;
  } else {
    auditorUserId = uAuditor[0].id;
    await connection.query(`UPDATE users SET status = 'ACTIVE', password_hash = ? WHERE id = ?`, [passHash, auditorUserId]);
  }
  await connection.query(`DELETE FROM user_roles WHERE user_id = ?`, [auditorUserId]);
  await connection.query(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`, [auditorUserId, auditorRoleId]);

  await connection.end();
}

async function runDPRMWorkflowTests() {
  console.log('====================================================');
  console.log('   DATA PRINCIPAL RIGHTS MANAGEMENT (DPRM) E2E SUITE');
  console.log('====================================================\n');

  try {
    console.log('1. Setting up test database users...');
    await setupTestUsers();

    console.log('2. Authenticating test users...');
    const adminLogin = await authService.loginUser('dprm.admin@test.com', 'TestPass123!', 1);
    assert(adminLogin && adminLogin.token, 'Tenant Admin authenticated');

    const auditorLogin = await authService.loginUser('dprm.auditor@test.com', 'TestPass123!', 1);
    assert(auditorLogin && auditorLogin.token, 'Auditor authenticated');

    const adminUser = adminLogin.user;
    const auditorUser = auditorLogin.user;

    // 3. Test 5 BRD Rights Creation
    console.log('\n3. Testing creation of 5 BRD Rights requests...');
    const brdRights = ['ACCESS', 'CORRECTION', 'ERASURE', 'CONSENT_WITHDRAWAL', 'GRIEVANCE'];

    for (const right of brdRights) {
      const dsr = await dsrService.createDSR(1, {
        data_subject_identifier: `dprm_${right.toLowerCase()}@test.com`,
        request_type: right,
        description: `E2E Test for BRD Right: ${right}`
      }, adminUser.id);

      assert(dsr && dsr.id, `Created DSR for right: ${right}`);
      assert(dsr.status === 'SUBMITTED', `Initial status is SUBMITTED for ${right}`);
      assert(dsr.request_type === right, `Request type correctly saved as ${right}`);
    }

    // 4. Test Full 7-Stage Workflow Processing
    console.log('\n4. Executing complete 7-stage DPRM workflow...');
    const testDsr = await dsrService.createDSR(1, {
      data_subject_identifier: 'workflow_subject@acme.com',
      request_type: 'ACCESS',
      description: 'End-to-End 7-Stage Workflow Test'
    }, adminUser.id);
    assert(testDsr.status === 'SUBMITTED', 'Stage 1: Request Submitted');

    // Stage 2: Identity Verification
    console.log('   -> Executing Stage 2: Identity Verification...');
    const verifiedDsr = await dsrService.verifyIdentity(adminUser.id, 1, testDsr.id, {
      verification_status: 'VERIFIED',
      notes: 'Email ownership confirmed via OTP token'
    });
    assert(verifiedDsr.verification_status === 'VERIFIED', 'Verification status set to VERIFIED');
    assert(verifiedDsr.status === 'CASE_ASSIGNED', 'Status automatically advanced to CASE_ASSIGNED on verification');
    assert(verifiedDsr.verified_by_name !== null, 'verified_by handler populated');

    // Stage 3: Case Assignment
    console.log('   -> Executing Stage 3: Case Assignment...');
    const assignedDsr = await dsrService.assignCase(adminUser.id, 1, testDsr.id, {
      assigned_to: auditorUser.id,
      notes: 'Assigned to primary Privacy Auditor'
    });
    assert(Number(assignedDsr.assigned_to) === Number(auditorUser.id), 'Assigned handler updated');
    assert(assignedDsr.status === 'CASE_ASSIGNED', 'Stage 3 status confirmed');

    // Stage 4: Data Collection
    console.log('   -> Executing Stage 4: Data Collection...');
    const collectedDsr = await dsrService.collectData(auditorUser.id, 1, testDsr.id, {
      data_collection_notes: 'Located PII in Postgres DB (users table) and S3 audit backups.'
    });
    assert(collectedDsr.data_collection_notes.includes('Postgres DB'), 'Data collection notes saved');
    assert(collectedDsr.status === 'DATA_COLLECTION', 'Status advanced to DATA_COLLECTION');

    // Stage 5: Approval Workflow & Role Guard Verification
    console.log('   -> Executing Stage 5: Approval Gate...');
    // Negative test: Auditor role lacks approval permission
    let roleErrorCaught = false;
    try {
      await dsrService.approveDSR(auditorUser.id, ['AUDITOR'], 1, testDsr.id, {
        approval_status: 'APPROVED',
        approval_notes: 'Unauthorized approval attempt'
      });
    } catch (err) {
      if (err.status === 403) roleErrorCaught = true;
    }
    assert(roleErrorCaught, 'Approval gate strictly rejected AUDITOR role (HTTP 403)');

    // Positive test: Tenant Admin approves
    const approvedDsr = await dsrService.approveDSR(adminUser.id, adminUser.roles.map(r => r.code), 1, testDsr.id, {
      approval_status: 'APPROVED',
      approval_notes: 'DPO Sign-Off: Fulfillment approved under GDPR Art. 15'
    });
    assert(approvedDsr.approval_status === 'APPROVED', 'Approval status set to APPROVED');
    assert(approvedDsr.status === 'RESPONSE_GENERATION', 'Status advanced to RESPONSE_GENERATION');

    // Stage 6: Response Generation
    console.log('   -> Executing Stage 6: Response Generation...');
    const responseDsr = await dsrService.generateResponse(adminUser.id, 1, testDsr.id, {
      response_summary: 'Compiled PII data extract package and verified redactions.',
      response_file_name: 'pii_export_workflow_subject_101.zip'
    });
    assert(responseDsr.response_summary.includes('Compiled PII'), 'Response summary recorded');
    assert(responseDsr.response_file_name === 'pii_export_workflow_subject_101.zip', 'Export filename recorded');

    // Stage 7: Closure
    console.log('   -> Executing Stage 7: Case Closure...');
    const closedDsr = await dsrService.closeDSR(adminUser.id, 1, testDsr.id, {
      resolution_notes: 'Data principal extract delivered. Case successfully fulfilled and closed.'
    });
    assert(closedDsr.status === 'CLOSED', 'Status set to CLOSED');
    assert(closedDsr.completed_at !== null, 'completed_at populated');

    // 5. Verify Immutable Audit Trail (dsr_history)
    console.log('\n5. Verifying Immutable dsr_history Audit Trail...');
    const historyLogs = await dsrService.getDSRHistory(1, testDsr.id);
    assert(Array.isArray(historyLogs) && historyLogs.length >= 6, `Retrieved ${historyLogs.length} audit log entries`);

    const actionCodes = historyLogs.map(h => h.action);
    assert(actionCodes.includes('REQUEST_SUBMITTED'), 'Audit log contains REQUEST_SUBMITTED');
    assert(actionCodes.includes('IDENTITY_VERIFIED'), 'Audit log contains IDENTITY_VERIFIED');
    assert(actionCodes.includes('CASE_ASSIGNED'), 'Audit log contains CASE_ASSIGNED');
    assert(actionCodes.includes('DATA_COLLECTED'), 'Audit log contains DATA_COLLECTED');
    assert(actionCodes.includes('DSR_APPROVED'), 'Audit log contains DSR_APPROVED');
    assert(actionCodes.includes('RESPONSE_GENERATED'), 'Audit log contains RESPONSE_GENERATED');
    assert(actionCodes.includes('DSR_CLOSED'), 'Audit log contains DSR_CLOSED');

    // 6. Verify Tenant Context Isolation
    console.log('\n6. Verifying Tenant Context Isolation...');
    const crossTenantDsr = await dsrService.getDSRById(2, testDsr.id);
    assert(crossTenantDsr === null, 'Cross-tenant query for tenant 2 returned null');

    console.log('\n====================================================');
    console.log(`✅ DPRM WORKFLOW E2E TEST PASSED (${passedTests}/${totalTests} Assertions)`);
    console.log('====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ E2E TEST FAILED:', err);
    process.exit(1);
  }
}

runDPRMWorkflowTests();
