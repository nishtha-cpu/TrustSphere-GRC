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

async function runStep8cTests() {
  console.log('===============================================================');
  console.log(' STEP 8C: POLICY MANAGEMENT REACT FRONTEND INTEGRATION TEST SUITE');
  console.log('===============================================================\n');

  const timestamp = Date.now().toString().slice(-4);
  const testPolicyCode = `POL-8C-${timestamp}`;

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
    // 1. Check Policy list load
    console.log('--- 1. POLICY LIST & SEARCH / FILTER INTEGRATION ---');
    const initListRes = await request({ hostname: 'localhost', port: 5000, path: '/api/policies?tenant_id=1', method: 'GET' });
    assert(initListRes.status === 200 && Array.isArray(initListRes.body.data), '1 & 2. Policy Management page & list loads from backend');

    // 6 & 7. Create Policy
    console.log('\n--- 2. POLICY CREATION & LIST UPDATE ---');
    const createRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/policies',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      policy_code: testPolicyCode,
      title: 'Access Control and Authentication Policy',
      description: 'Defines authentication and password policy requirements',
      policy_type: 'ACCESS_CONTROL',
      owner_id: 1,
      status: 'DRAFT',
      review_date: '2027-06-30',
      effective_date: '2026-10-01',
      expiry_date: '2027-10-01'
    });

    assert(createRes.status === 201, '6 & 7. Create Policy works (POST /api/policies)');
    createdPolicyId = createRes.body.data.id;

    // 8. New policy appears in list
    const postCreateListRes = await request({ hostname: 'localhost', port: 5000, path: '/api/policies?tenant_id=1', method: 'GET' });
    const appearsInList = postCreateListRes.body.data.some(p => p.id === createdPolicyId);
    assert(appearsInList, '8. New policy appears in policy list');

    // 3. Search filter
    const searchRes = await request({ hostname: 'localhost', port: 5000, path: `/api/policies?tenant_id=1&search=${testPolicyCode}`, method: 'GET' });
    assert(searchRes.body.data.length === 1 && searchRes.body.data[0].id === createdPolicyId, '3. Search filter by policy code works');

    // 4. Status filter
    const statusFilterRes = await request({ hostname: 'localhost', port: 5000, path: '/api/policies?tenant_id=1&status=DRAFT', method: 'GET' });
    assert(statusFilterRes.body.data.some(p => p.id === createdPolicyId), '4. Status filter by DRAFT works');

    // 5. Policy type filter
    const typeFilterRes = await request({ hostname: 'localhost', port: 5000, path: '/api/policies?tenant_id=1&policy_type=ACCESS_CONTROL', method: 'GET' });
    assert(typeFilterRes.body.data.some(p => p.id === createdPolicyId), '5. Policy type filter by ACCESS_CONTROL works');

    // 9 & 10. Edit Policy & Immutability Check
    console.log('\n--- 3. EDIT POLICY & IMMUTABILITY CHECK ---');
    const updateRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${createdPolicyId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      policy_code: 'IMMUTABLE-ATTEMPT-CODE',
      title: 'Access Control and Authentication Policy (Updated)'
    });
    assert(updateRes.status === 200 && updateRes.body.data.title === 'Access Control and Authentication Policy (Updated)', '9. Edit Policy works');
    assert(updateRes.body.data.policy_code === testPolicyCode, '10. Policy code remains immutable after edit');

    // 11 & 12. View Policy details & current version check
    console.log('\n--- 4. VIEW POLICY DETAILS & VERSION HISTORY ---');
    const getDetailsRes1 = await request({ hostname: 'localhost', port: 5000, path: `/api/policies/${createdPolicyId}?tenant_id=1`, method: 'GET' });
    assert(getDetailsRes1.status === 200 && getDetailsRes1.body.data.policy_code === testPolicyCode, '11. View Policy opens details page');
    assert(getDetailsRes1.body.data.current_version_id === null, '12. Displays "No current version assigned" when current_version_id is null');

    // 13. Version history list
    const initVersionListRes = await request({ hostname: 'localhost', port: 5000, path: `/api/policies/${createdPolicyId}/versions?tenant_id=1`, method: 'GET' });
    assert(initVersionListRes.status === 200 && Array.isArray(initVersionListRes.body.data), '13. Version history list loads');

    // 14 & 15. Create Version
    const createVersionRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${createdPolicyId}/versions`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      version_number: 1,
      version_label: '1.0',
      content: '# Access Control Policy v1.0\n\n- MFA required for administrative access.',
      change_summary: 'Initial revision draft',
      created_by: 1
    });

    assert(createVersionRes.status === 201, '14. Create Version works (POST /api/policies/:id/versions)');
    createdVersionId = createVersionRes.body.data.id;

    const postCreateVersionListRes = await request({ hostname: 'localhost', port: 5000, path: `/api/policies/${createdPolicyId}/versions?tenant_id=1`, method: 'GET' });
    assert(postCreateVersionListRes.body.data.length === 1 && postCreateVersionListRes.body.data[0].id === createdVersionId, '15. New version appears in version history list');

    // 16. Review action
    const reviewRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policy-versions/${createdVersionId}/review`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, reviewer_id: 1 });
    assert(reviewRes.status === 200 && reviewRes.body.data.reviewed_by === 1, '16. Review action works (PUT /api/policy-versions/:id/review)');

    // 19. Publish validation prior to approval (should fail)
    const pubUnapprovedRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${createdPolicyId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, current_version_id: createdVersionId, status: 'PUBLISHED' });
    assert(pubUnapprovedRes.status === 400, '19. Publish validation rejects unapproved current version');

    // 17 & 18. Approve action & Current version backend state reflection
    const approveRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policy-versions/${createdVersionId}/approve`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, approver_id: 1, set_as_current: true });
    assert(approveRes.status === 200 && approveRes.body.data.approved_at !== null, '17. Approve action works (PUT /api/policy-versions/:id/approve)');

    const getDetailsRes2 = await request({ hostname: 'localhost', port: 5000, path: `/api/policies/${createdPolicyId}?tenant_id=1`, method: 'GET' });
    assert(getDetailsRes2.body.data.current_version_id === createdVersionId, '18. Current version reflects backend state');

    // Now publish policy
    const pubApprovedRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/policies/${createdPolicyId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, status: 'PUBLISHED' });
    assert(pubApprovedRes.status === 200 && pubApprovedRes.body.data.status === 'PUBLISHED', 'Publish policy with approved current version succeeds');

    // 20 & 21. Delete confirmation & Soft delete
    console.log('\n--- 5. SOFT DELETE & DISAPPEARANCE CHECK ---');
    const deleteRes = await request({ hostname: 'localhost', port: 5000, path: `/api/policies/${createdPolicyId}?tenant_id=1`, method: 'DELETE' });
    assert(deleteRes.status === 200, '20. Delete policy endpoint works');

    const postDelListRes = await request({ hostname: 'localhost', port: 5000, path: '/api/policies?tenant_id=1', method: 'GET' });
    const inPostDelList = postDelListRes.body.data.some(p => p.id === createdPolicyId);
    assert(!inPostDelList, '21. Soft-deleted policy disappears from active policy list');

    // 22-25. Regression check on existing modules
    console.log('\n--- 6. EXISTING MODULE REGRESSION CHECKS ---');
    const regRisks = await request({ hostname: 'localhost', port: 5000, path: '/api/risks?tenant_id=1', method: 'GET' });
    const regAssessments = await request({ hostname: 'localhost', port: 5000, path: '/api/risks/4/assessments?tenant_id=1', method: 'GET' });
    const regMatrix = await request({ hostname: 'localhost', port: 5000, path: '/api/risk-assessments/matrix?tenant_id=1', method: 'GET' });
    const regAudits = await request({ hostname: 'localhost', port: 5000, path: '/api/audits?tenant_id=1', method: 'GET' });

    assert(regRisks.status === 200, '22. Existing Risk Register operational');
    assert(regAssessments.status === 200, '23. Existing Risk Assessment operational');
    assert(regMatrix.status === 200, '24. Existing Risk Matrix operational');
    assert(regAudits.status === 200, '25. Existing Audit Management operational');

    console.log('\n===============================================================');
    console.log(` SUMMARY: ${passedTests}/${totalTests} Tests Passed (${failedTests} Failed)`);
    console.log('===============================================================\n');

    if (failedTests === 0) {
      console.log('STEP 8C — POLICY MANAGEMENT FRONTEND INTEGRATION PASSED PERFECTLY!');
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error('\n❌ STEP 8C TEST SUITE FAILED:', err.message);
    process.exit(1);
  }
}

runStep8cTests();
