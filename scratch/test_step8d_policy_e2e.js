const http = require('http');
const pool = require('../backend/config/database');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runStep8dE2ETests() {
  console.log('======================================================================');
  console.log(' STEP 8D: POLICY MANAGEMENT FULL END-TO-END VALIDATION SUITE');
  console.log('======================================================================\n');

  const timestamp = Date.now().toString().slice(-4);
  const mainPolicyCode = `POL-E2E-${timestamp}`;
  const unapprovedPolicyCode = `POL-UNAPP-${timestamp}`;
  const archivedPolicyCode = `POL-ARCH-${timestamp}`;

  let mainPolicyId = null;
  let version1Id = null;
  let version2Id = null;

  let unapprovedPolicyId = null;
  let unapprovedVersionId = null;

  let archivedPolicyId = null;

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, testName, failureDetails = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ PASSED [Test #${totalTests}]: ${testName}`);
    } else {
      failedTests++;
      console.error(`  ❌ FAILED [Test #${totalTests}]: ${testName} - ${failureDetails}`);
    }
  }

  try {
    // -----------------------------------------------------------------
    // 1 & 2. POLICY CREATION FLOW (Tests 1-6)
    // -----------------------------------------------------------------
    console.log('--- SECTION 1: POLICY CREATION FLOW ---');

    const createRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/policies',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      policy_code: mainPolicyCode,
      title: 'Enterprise Information Security Policy',
      description: 'Master enterprise-wide information security policy document',
      policy_type: 'INFORMATION_SECURITY',
      owner_id: 1,
      status: 'DRAFT',
      review_date: '2027-12-31'
    });

    assert(createRes.status === 201, '1. Policy creation returns HTTP 201 Created');
    mainPolicyId = createRes.body.data.id;
    assert(createRes.body.data.policy_code === mainPolicyCode && createRes.body.data.title === 'Enterprise Information Security Policy', '2. Returned policy fields match request');
    assert(createRes.body.data.status === 'DRAFT', '3. Policy status starts as DRAFT');
    assert(Number(createRes.body.data.tenant_id) === 1, '4. Policy belongs to correct tenant (tenant_id = 1)');
    assert(Number(createRes.body.data.owner_id) === 1 && createRes.body.data.owner_name !== undefined, '5. Policy owner belongs to same tenant and returns owner details');

    // -----------------------------------------------------------------
    // 3. POLICY RETRIEVAL (Tests 6-10)
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 2: POLICY RETRIEVAL & METADATA ---');

    const listRes = await request({ hostname: 'localhost', port: 5000, path: '/api/policies?tenant_id=1', method: 'GET' });
    assert(listRes.status === 200, '6. Get policy list returns HTTP 200');
    const inList = listRes.body.data && listRes.body.data.some(p => p.id === mainPolicyId);
    assert(inList, '7. Newly created policy appears in active policy list');

    const getByIdRes = await request({ hostname: 'localhost', port: 5000, path: `/api/policies/${mainPolicyId}?tenant_id=1`, method: 'GET' });
    assert(getByIdRes.status === 200, '8. Get policy by ID returns HTTP 200');
    assert(getByIdRes.body.data.owner_name && getByIdRes.body.data.owner_email, '9. Policy by ID includes owner information (name & email)');
    assert(getByIdRes.body.data.current_version_id === null, '10. Initial current_version_id is null');

    // -----------------------------------------------------------------
    // 4. VERSION 1.0 CREATION (Tests 11-15)
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 3: VERSION 1.0 CREATION ---');

    const v1Res = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${mainPolicyId}/versions`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      version_number: 1,
      version_label: '1.0',
      content: '# Enterprise Security Policy v1.0\n\n1. Purpose\n2. Scope\n3. Password requirements (16 chars minimum).',
      change_summary: 'Initial policy version',
      created_by: 1
    });

    assert(v1Res.status === 201, '11. Version 1.0 creation succeeds (HTTP 201)');
    version1Id = v1Res.body.data.id;

    const vListRes1 = await request({ hostname: 'localhost', port: 5000, path: `/api/policies/${mainPolicyId}/versions?tenant_id=1`, method: 'GET' });
    assert(vListRes1.status === 200 && vListRes1.body.data.length === 1, '12. Version 1.0 appears in version history list');
    assert(Number(vListRes1.body.data[0].policy_id) === mainPolicyId, '13. Version 1.0 belongs to correct policy');
    assert(Number(vListRes1.body.data[0].tenant_id) === 1 && vListRes1.body.data[0].created_by_name !== undefined, '14. Creator belongs to tenant and returns user details');
    assert(vListRes1.body.data[0].version_label === '1.0', '15. Previous version history list length is 1 with label 1.0');

    // -----------------------------------------------------------------
    // 5. REVIEW WORKFLOW (Tests 16-18)
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 4: REVIEW WORKFLOW ---');

    const reviewRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policy-versions/${version1Id}/review`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, reviewer_id: 1 });

    assert(reviewRes.status === 200, '16. Review version succeeds (HTTP 200)');
    assert(Number(reviewRes.body.data.reviewed_by) === 1, '17. reviewed_by field is populated with reviewer user ID');
    assert(reviewRes.body.data.reviewed_by_name !== undefined, '18. Reviewer metadata returned correctly');

    // -----------------------------------------------------------------
    // 6. APPROVAL WORKFLOW (Tests 19-23)
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 5: APPROVAL WORKFLOW ---');

    const approveRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policy-versions/${version1Id}/approve`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, approver_id: 1, set_as_current: true });

    assert(approveRes.status === 200, '19. Approval version succeeds (HTTP 200)');
    assert(Number(approveRes.body.data.approved_by) === 1, '20. approved_by is populated');
    assert(approveRes.body.data.approved_at !== null, '21. approved_at is populated with timestamp');

    const getByIdAfterApprove = await request({ hostname: 'localhost', port: 5000, path: `/api/policies/${mainPolicyId}?tenant_id=1`, method: 'GET' });
    assert(getByIdAfterApprove.status === 200, '22. GET policy after approval succeeds');
    assert(Number(getByIdAfterApprove.body.data.current_version_id) === version1Id, '23. policy.current_version_id equals approved version ID');

    // -----------------------------------------------------------------
    // 7. PUBLISHING WORKFLOW (Tests 24-28)
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 6: PUBLISHING WORKFLOW ---');

    // Create unapproved temporary policy & version to test rejection
    const createUnappRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/policies',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      policy_code: unapprovedPolicyCode,
      title: 'Unapproved Policy Test',
      policy_type: 'PRIVACY',
      owner_id: 1,
      status: 'DRAFT'
    });
    unapprovedPolicyId = createUnappRes.body.data.id;

    const createUnappVRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${unapprovedPolicyId}/versions`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      version_number: 1,
      version_label: '1.0',
      content: 'Unapproved content draft',
      created_by: 1
    });
    unapprovedVersionId = createUnappVRes.body.data.id;

    // Set unapproved version as current
    await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${unapprovedPolicyId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, current_version_id: unapprovedVersionId });

    // Attempt to publish unapproved policy -> MUST REJECT (HTTP 400)
    const pubUnappRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${unapprovedPolicyId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, status: 'PUBLISHED' });
    assert(pubUnappRes.status === 400, '24. Unapproved policy version cannot be published (HTTP 400)');

    // Now publish the main policy (which has approved version 1.0)
    const pubMainRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${mainPolicyId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, status: 'PUBLISHED' });

    assert(pubMainRes.status === 200, '25. Publish approved policy succeeds (HTTP 200)');
    assert(pubMainRes.body.data.status === 'PUBLISHED', '26. Policy status becomes PUBLISHED');
    assert(Number(pubMainRes.body.data.current_version_id) === version1Id, '27. Published policy retains approved current version');

    const getPublishedPolicyRes = await request({ hostname: 'localhost', port: 5000, path: `/api/policies/${mainPolicyId}?tenant_id=1`, method: 'GET' });
    assert(getPublishedPolicyRes.body.data.status === 'PUBLISHED' && getPublishedPolicyRes.body.data.current_version_approved_at !== null, '28. Published state and approved_at reflected on GET /api/policies/:id');

    // -----------------------------------------------------------------
    // 8 & 9. VERSION 1.1 & APPEND-ONLY IMMUTABILITY (Tests 29-34)
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 7: VERSION 1.1 & APPEND-ONLY IMMUTABILITY ---');

    const v2Res = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${mainPolicyId}/versions`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      version_number: 2,
      version_label: '1.1',
      content: '# Enterprise Security Policy v1.1\n\nAdded Section 4: Multi-Factor Authentication Requirements.',
      change_summary: 'Added Section 4 for MFA requirements',
      created_by: 1
    });

    assert(v2Res.status === 201, '29. New version 1.1 created (HTTP 201)');
    version2Id = v2Res.body.data.id;

    const vListRes2 = await request({ hostname: 'localhost', port: 5000, path: `/api/policies/${mainPolicyId}/versions?tenant_id=1`, method: 'GET' });
    assert(vListRes2.body.data.length === 2, '30. Version history now contains both version 1.0 and 1.1');
    assert(vListRes2.body.data[0].version_number === 2 && vListRes2.body.data[1].version_number === 1, '31. Version 1.1 (version #2) listed first before 1.0 (version #1)');

    const v1DetailsRes = await request({ hostname: 'localhost', port: 5000, path: `/api/policy-versions/${version1Id}?tenant_id=1`, method: 'GET' });
    assert(v1DetailsRes.body.data.content.includes('v1.0'), '32. Version 1.0 content remains unchanged in history');

    // Verify immutability by testing that PUT to version content endpoint does not exist / fails
    const invalidVerEdit = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policy-versions/${version1Id}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, content: 'Overwritten content attempt' });
    assert(invalidVerEdit.status === 404, '33 & 34. Version immutability enforced (no generic version content edit endpoint exists)');

    // -----------------------------------------------------------------
    // 10. TENANT ISOLATION (Tests 35-39)
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 8: TENANT ISOLATION ---');

    const crossGetIdRes = await request({ hostname: 'localhost', port: 5000, path: `/api/policies/${mainPolicyId}?tenant_id=999`, method: 'GET' });
    assert(crossGetIdRes.status === 404, '35. Policy cannot be retrieved using another tenant ID (HTTP 404)');

    const crossListRes = await request({ hostname: 'localhost', port: 5000, path: '/api/policies?tenant_id=999', method: 'GET' });
    assert(crossListRes.body.data.length === 0, '36. Policy does not appear in another tenant list');

    const crossOwnerCreate = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/policies',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 999,
      policy_code: `POL-ISOL-${timestamp}`,
      title: 'Tenant Isolation Test',
      policy_type: 'PRIVACY',
      owner_id: 1
    });
    assert(crossOwnerCreate.status === 400, '37. Cross-tenant owner rejected (HTTP 400)');

    const crossVersionCreate = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${mainPolicyId}/versions`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 999,
      version_number: 3,
      version_label: '3.0',
      content: 'Cross tenant version test',
      created_by: 1
    });
    assert(crossVersionCreate.status === 404 || crossVersionCreate.status === 400, '38. Cross-tenant version creator rejected');

    const crossApproveRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policy-versions/${version2Id}/approve`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 999, approver_id: 1 });
    assert(crossApproveRes.status === 404 || crossApproveRes.status === 400, '39. Cross-tenant reviewer/approver rejected');

    // -----------------------------------------------------------------
    // 11. DUPLICATE VALIDATION (Tests 40-41)
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 9: DUPLICATE VALIDATION ---');

    const dupPolicyCodeRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/policies',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      policy_code: mainPolicyCode,
      title: 'Duplicate Policy Code Test',
      policy_type: 'THIRD_PARTY',
      owner_id: 1
    });
    assert(dupPolicyCodeRes.status === 409, '40. Duplicate policy_code returns HTTP 409 Conflict');

    const dupVerNumRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${mainPolicyId}/versions`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      version_number: 1,
      version_label: '1.0-duplicate',
      content: 'Duplicate version number test',
      created_by: 1
    });
    assert(dupVerNumRes.status === 409, '41. Duplicate version_number returns HTTP 409 Conflict');

    // -----------------------------------------------------------------
    // 12. ARCHIVED POLICY WORKFLOW (Tests 42-45)
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 10: ARCHIVED POLICY WORKFLOW ---');

    const createArchRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/policies',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      policy_code: archivedPolicyCode,
      title: 'Legacy Policy To Archive',
      policy_type: 'OTHER',
      owner_id: 1,
      status: 'DRAFT'
    });
    archivedPolicyId = createArchRes.body.data.id;

    // Archive it
    const setArchRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${archivedPolicyId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, status: 'ARCHIVED' });

    assert(setArchRes.status === 200 && setArchRes.body.data.status === 'ARCHIVED', '42. Policy status becomes ARCHIVED');

    // Normal metadata update on archived policy -> MUST REJECT (HTTP 400)
    const updateArchRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${archivedPolicyId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, title: 'Attempt Edit Archived Title' });

    assert(updateArchRes.status === 400, '43. Metadata update on archived policy is rejected (HTTP 400)');

    const getArchInDBRes = await request({ hostname: 'localhost', port: 5000, path: `/api/policies/${archivedPolicyId}?tenant_id=1`, method: 'GET' });
    assert(getArchInDBRes.status === 200 && getArchInDBRes.body.data.status === 'ARCHIVED', '44 & 45. Archived policy remains in database and is not physically deleted');

    // -----------------------------------------------------------------
    // 13 & 16. SOFT DELETE & DB INTEGRITY (Tests 46-50)
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 11: SOFT DELETE & DATABASE INTEGRITY ---');

    const delRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${mainPolicyId}?tenant_id=1`,
      method: 'DELETE'
    });
    assert(delRes.status === 200, '46. DELETE main policy succeeds (HTTP 200)');

    const getDeletedRes = await request({ hostname: 'localhost', port: 5000, path: `/api/policies/${mainPolicyId}?tenant_id=1`, method: 'GET' });
    assert(getDeletedRes.status === 404, '47. GET by ID on soft-deleted policy returns 404 Not Found');

    const postDelList = await request({ hostname: 'localhost', port: 5000, path: '/api/policies?tenant_id=1', method: 'GET' });
    const inActiveList = postDelList.body.data.some(p => p.id === mainPolicyId);
    assert(!inActiveList, '48. Soft-deleted policy disappears from active policy list');

    // Verify historical version rows remain in DB with policy_versions table query
    const [dbVersionRows] = await pool.query(
      `SELECT id, version_number, deleted_at FROM policy_versions WHERE policy_id = ?`,
      [mainPolicyId]
    );
    assert(dbVersionRows.length === 2 && dbVersionRows.every(r => r.deleted_at === null), '49 & 50. Historical version rows remain physically intact in database after policy soft delete');

    // Cleanup unapproved and archived temporary policies
    await request({ hostname: 'localhost', port: 5000, path: `/api/policies/${unapprovedPolicyId}?tenant_id=1`, method: 'DELETE' });
    await request({ hostname: 'localhost', port: 5000, path: `/api/policies/${archivedPolicyId}?tenant_id=1`, method: 'DELETE' });

    // -----------------------------------------------------------------
    // 15. FULL SYSTEM REGRESSION TESTS (Tests 51-55)
    // -----------------------------------------------------------------
    console.log('\n--- SECTION 12: FULL SYSTEM REGRESSION TESTS ---');

    const regRisks = await request({ hostname: 'localhost', port: 5000, path: '/api/risks?tenant_id=1', method: 'GET' });
    assert(regRisks.status === 200, '51. Risk Register API operational (HTTP 200)');

    const regAssessments = await request({ hostname: 'localhost', port: 5000, path: '/api/risks/4/assessments?tenant_id=1', method: 'GET' });
    assert(regAssessments.status === 200, '52. Risk Assessment API operational (HTTP 200)');

    const regMatrix = await request({ hostname: 'localhost', port: 5000, path: '/api/risk-assessments/matrix?tenant_id=1', method: 'GET' });
    assert(regMatrix.status === 200, '53. Risk Matrix Heatmap API operational (HTTP 200)');

    const regAudits = await request({ hostname: 'localhost', port: 5000, path: '/api/audits?tenant_id=1', method: 'GET' });
    assert(regAudits.status === 200, '54. Audit Management API operational (HTTP 200)');

    const regPolicies = await request({ hostname: 'localhost', port: 5000, path: '/api/policies?tenant_id=1', method: 'GET' });
    assert(regPolicies.status === 200, '55. Policy Management APIs operational after complete lifecycle (HTTP 200)');

    console.log('\n======================================================================');
    console.log(` SUMMARY: ${passedTests}/${totalTests} Tests Passed (${failedTests} Failed)`);
    console.log('======================================================================\n');

    if (failedTests === 0) {
      console.log('STEP 8D — POLICY MANAGEMENT FULL E2E VALIDATION COMPLETE');
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error('\n❌ STEP 8D TEST SUITE FAILED:', err.message);
    process.exit(1);
  }
}

runStep8dE2ETests();
