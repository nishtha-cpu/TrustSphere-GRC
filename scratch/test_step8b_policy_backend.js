const http = require('http');

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

async function runStep8bTests() {
  console.log('===============================================================');
  console.log(' STEP 8B: POLICY MANAGEMENT CRUD BACKEND TEST SUITE');
  console.log('===============================================================\n');

  const timestamp = Date.now().toString().slice(-4);
  const testPolicyCode = `POL-8B-${timestamp}`;

  let createdPolicyId = null;
  let createdVersionId = null;

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, testName, failureDetails = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ PASSED: ${testName}`);
    } else {
      failedTests++;
      console.error(`  ❌ FAILED: ${testName} - ${failureDetails}`);
    }
  }

  try {
    // -----------------------------------------------------------------
    // POLICY TESTS (1-14)
    // -----------------------------------------------------------------
    console.log('--- POLICY CRUD & VALIDATION TESTS ---');

    // 1. Create valid policy
    const createPolicyRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/policies',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      policy_code: testPolicyCode,
      title: 'Information Security Policy',
      description: 'Master Information Security Governance Policy',
      policy_type: 'INFORMATION_SECURITY',
      owner_id: 1,
      status: 'DRAFT',
      review_date: '2027-01-01'
    });

    assert(createPolicyRes.status === 201, '1. Create valid policy (POST /api/policies)', JSON.stringify(createPolicyRes.body));
    createdPolicyId = createPolicyRes.body.data.id;

    // 2. Get policy list
    const getListRes = await request({ hostname: 'localhost', port: 5000, path: '/api/policies?tenant_id=1', method: 'GET' });
    const foundInList = getListRes.body.data && getListRes.body.data.some(p => p.id === createdPolicyId);
    assert(getListRes.status === 200 && foundInList, '2. Get policy list (GET /api/policies?tenant_id=1)');

    // 3. Get policy by ID
    const getByIdRes = await request({ hostname: 'localhost', port: 5000, path: `/api/policies/${createdPolicyId}?tenant_id=1`, method: 'GET' });
    assert(getByIdRes.status === 200 && getByIdRes.body.data.policy_code === testPolicyCode, '3. Get policy by ID');

    // 4. Update policy
    const updateRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${createdPolicyId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      title: 'Information Security Policy (Updated Title)',
      description: 'Updated policy description'
    });
    assert(updateRes.status === 200 && updateRes.body.data.title === 'Information Security Policy (Updated Title)', '4. Update policy metadata');

    // 5. policy_code cannot be changed (immutable check)
    const updateCodeRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${createdPolicyId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      policy_code: 'ATTEMPT-CODE-CHANGE'
    });
    assert(updateCodeRes.body.data.policy_code === testPolicyCode, '5. policy_code is immutable after creation');

    // 6. Duplicate policy_code -> 409 Conflict
    const dupCodeRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/policies',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      policy_code: testPolicyCode,
      title: 'Duplicate Policy Test',
      policy_type: 'PRIVACY',
      owner_id: 1
    });
    assert(dupCodeRes.status === 409, '6. Duplicate policy_code returns 409 Conflict');

    // 7. Invalid policy_type -> 400 Bad Request
    const invalidTypeRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/policies',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      policy_code: `POL-INV-${timestamp}`,
      title: 'Invalid Type Test',
      policy_type: 'INVALID_CATEGORY_NAME',
      owner_id: 1
    });
    assert(invalidTypeRes.status === 400, '7. Invalid policy_type returns 400 Bad Request');

    // 8. Invalid status -> 400 Bad Request
    const invalidStatusRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/policies',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      policy_code: `POL-INVSTAT-${timestamp}`,
      title: 'Invalid Status Test',
      policy_type: 'PRIVACY',
      owner_id: 1,
      status: 'INVALID_STATUS_VALUE'
    });
    assert(invalidStatusRes.status === 400, '8. Invalid status returns 400 Bad Request');

    // 9. Invalid owner -> 400 Bad Request
    const invalidOwnerRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/policies',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      policy_code: `POL-INVOWN-${timestamp}`,
      title: 'Invalid Owner Test',
      policy_type: 'PRIVACY',
      owner_id: 999999
    });
    assert(invalidOwnerRes.status === 400, '9. Invalid owner_id returns 400 Bad Request');

    // 10. Cross-tenant owner rejected -> 400 Bad Request
    const crossTenantOwnerRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/policies',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 999,
      policy_code: `POL-CROSS-${timestamp}`,
      title: 'Cross Tenant Test',
      policy_type: 'PRIVACY',
      owner_id: 1
    });
    assert(crossTenantOwnerRes.status === 400, '10. Cross-tenant owner rejected (400 Bad Request)');

    // 11. Tenant isolation check
    const tenantIsolationRes = await request({ hostname: 'localhost', port: 5000, path: '/api/policies?tenant_id=999', method: 'GET' });
    assert(tenantIsolationRes.status === 200 && tenantIsolationRes.body.data.length === 0, '11. Tenant isolation enforced (tenant 999 returns 0 records)');

    // -----------------------------------------------------------------
    // POLICY VERSION TESTS (15-23)
    // -----------------------------------------------------------------
    console.log('\n--- POLICY VERSION TESTS ---');

    // 15. Create version 1
    const createVersionRes1 = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${createdPolicyId}/versions`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      version_number: 1,
      version_label: '1.0',
      content: '# Information Security Policy\n\n1. All passwords must be at least 16 characters.',
      change_summary: 'Initial draft version 1.0',
      created_by: 1
    });
    assert(createVersionRes1.status === 201, '15. Create policy version 1 (POST /api/policies/:id/versions)', JSON.stringify(createVersionRes1.body));
    createdVersionId = createVersionRes1.body.data.id;

    // 16. Get version list
    const getVersionListRes = await request({ hostname: 'localhost', port: 5000, path: `/api/policies/${createdPolicyId}/versions?tenant_id=1`, method: 'GET' });
    assert(getVersionListRes.status === 200 && getVersionListRes.body.data.length === 1, '16. Get version list');

    // 17. Get version by ID
    const getVersionByIdRes = await request({ hostname: 'localhost', port: 5000, path: `/api/policy-versions/${createdVersionId}?tenant_id=1`, method: 'GET' });
    assert(getVersionByIdRes.status === 200 && getVersionByIdRes.body.data.version_number === 1, '17. Get version by ID (GET /api/policy-versions/:id)');

    // 18. Duplicate version number -> 409 Conflict
    const dupVersionRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${createdPolicyId}/versions`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      version_number: 1,
      version_label: '1.0',
      content: 'Duplicate version content',
      created_by: 1
    });
    assert(dupVersionRes.status === 409, '18. Duplicate version number returns 409 Conflict');

    // 19. Invalid version number -> 400 Bad Request
    const invalidVerNumRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${createdPolicyId}/versions`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      version_number: -1,
      version_label: '0.0',
      content: 'Negative version content',
      created_by: 1
    });
    assert(invalidVerNumRes.status === 400, '19. Invalid version number returns 400 Bad Request');

    // 20. Missing content -> 400 Bad Request
    const missingContentRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${createdPolicyId}/versions`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      version_number: 2,
      version_label: '2.0',
      content: '',
      created_by: 1
    });
    assert(missingContentRes.status === 400, '20. Missing content returns 400 Bad Request');

    // 21. Cross-tenant creator rejected
    const crossTenantCreatorRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${createdPolicyId}/versions`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      version_number: 2,
      version_label: '2.0',
      content: 'Cross-tenant creator test',
      created_by: 99999
    });
    assert(crossTenantCreatorRes.status === 400, '21. Cross-tenant creator rejected (400 Bad Request)');

    // 22. Cross-policy/current-version mismatch rejected
    const mismatchRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${createdPolicyId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      current_version_id: 999999,
      status: 'PUBLISHED'
    });
    assert(mismatchRes.status === 400, '22. Cross-policy/invalid current_version_id rejected (400 Bad Request)');

    // 23. Version history remains intact (create version 2)
    const createVersionRes2 = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${createdPolicyId}/versions`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      version_number: 2,
      version_label: '1.1',
      content: '# Information Security Policy v1.1\n\n1. Enforce 16 character minimum password.',
      change_summary: 'Added password complexity requirements',
      created_by: 1
    });
    assert(createVersionRes2.status === 201, '23. Append-only version history intact (version 2 created)');

    // -----------------------------------------------------------------
    // PUBLISHING LIFECYCLE TESTS (24-26)
    // -----------------------------------------------------------------
    console.log('\n--- PUBLISHING LIFECYCLE TESTS ---');

    // 24. Attempt to publish policy without current version -> rejected
    const pubWithoutCurrRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${createdPolicyId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, status: 'PUBLISHED' });
    assert(pubWithoutCurrRes.status === 400, '24. Publish policy without current_version_id rejected');

    // 25. Attempt to publish policy without approved version -> rejected
    // First set unapproved version 1 as current_version_id
    const setUnapprovedRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${createdPolicyId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, current_version_id: createdVersionId });
    assert(setUnapprovedRes.status === 200, 'Set version 1 as current_version_id on draft policy');

    const pubUnapprovedRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${createdPolicyId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, status: 'PUBLISHED' });
    assert(pubUnapprovedRes.status === 400, '25. Publish policy with unapproved current version rejected');

    // 26. Valid approved & current version satisfies publish validation
    // Approve version 1
    const approveVersionRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policy-versions/${createdVersionId}/approve`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, approver_id: 1, set_as_current: true });
    assert(approveVersionRes.status === 200 && approveVersionRes.body.data.approved_at !== null, 'Approve version 1 sign-off');

    // Now publish policy
    const pubApprovedRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${createdPolicyId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, status: 'PUBLISHED' });
    assert(pubApprovedRes.status === 200 && pubApprovedRes.body.data.status === 'PUBLISHED', '26. Publish policy with approved current version succeeds');

    // -----------------------------------------------------------------
    // SOFT DELETE & CLEANUP (12-14)
    // -----------------------------------------------------------------
    console.log('\n--- SOFT DELETE TESTS ---');

    // 12. Soft delete policy
    const deletePolicyRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${createdPolicyId}?tenant_id=1`,
      method: 'DELETE'
    });
    assert(deletePolicyRes.status === 200, '12. Soft delete policy (DELETE /api/policies/:id?tenant_id=1)');

    // 13. Deleted policy excluded from GET list
    const getPostDeleteListRes = await request({ hostname: 'localhost', port: 5000, path: '/api/policies?tenant_id=1', method: 'GET' });
    const inPostDeleteList = getPostDeleteListRes.body.data && getPostDeleteListRes.body.data.some(p => p.id === createdPolicyId);
    assert(!inPostDeleteList, '13. Deleted policy excluded from GET list');

    // 14. Deleted policy GET by ID -> 404 Not Found
    const getPostDeleteByIdRes = await request({ hostname: 'localhost', port: 5000, path: `/api/policies/${createdPolicyId}?tenant_id=1`, method: 'GET' });
    assert(getPostDeleteByIdRes.status === 404, '14. Deleted policy GET by ID returns 404 Not Found');

    // -----------------------------------------------------------------
    // REGRESSION TESTS (27-30)
    // -----------------------------------------------------------------
    console.log('\n--- FULL SYSTEM REGRESSION TESTS ---');

    const regRiskList = await request({ hostname: 'localhost', port: 5000, path: '/api/risks?tenant_id=1', method: 'GET' });
    assert(regRiskList.status === 200, '27. Risk Register API (GET /api/risks) operational');

    const regRiskAssess = await request({ hostname: 'localhost', port: 5000, path: '/api/risks/4/assessments?tenant_id=1', method: 'GET' });
    assert(regRiskAssess.status === 200, '28. Risk Assessment API operational');

    const regMatrix = await request({ hostname: 'localhost', port: 5000, path: '/api/risk-assessments/matrix?tenant_id=1', method: 'GET' });
    assert(regMatrix.status === 200, '29. Risk Matrix Heatmap API operational');

    const regAudits = await request({ hostname: 'localhost', port: 5000, path: '/api/audits?tenant_id=1', method: 'GET' });
    assert(regAudits.status === 200, '30. Audit Management API operational');

    console.log('\n===============================================================');
    console.log(` SUMMARY: ${passedTests}/${totalTests} Tests Passed (${failedTests} Failed)`);
    console.log('===============================================================\n');

    if (failedTests === 0) {
      console.log('STEP 8B — POLICY CRUD BACKEND COMPLETE');
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error('\n❌ STEP 8B TEST SUITE FAILED:', err.message);
    process.exit(1);
  }
}

runStep8bTests();
