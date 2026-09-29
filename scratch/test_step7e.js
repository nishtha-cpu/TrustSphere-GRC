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

async function runTests() {
  console.log('=== STEP 7E CAPA REACT FRONTEND & INTEGRATION TEST SUITE ===\n');

  let testAuditId = null;
  let testFindingId = null;
  let createdCapaId = null;
  const testCapaCode = `CAPA-7E-${Date.now().toString().slice(-4)}`;

  try {
    // 1. Fetch audits or create one
    console.log('1. Fetching active audits list...');
    const auditsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/audits?tenant_id=1',
      method: 'GET'
    });

    if (auditsRes.status !== 200 || !auditsRes.body.data || auditsRes.body.data.length === 0) {
      console.log('No existing audit found. Creating temporary test audit...');
      const createAuditRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/audits',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        tenant_id: 1,
        audit_code: `AUD-7E-${Date.now().toString().slice(-4)}`,
        title: 'Step 7E CAPA Integration Test Audit',
        audit_type: 'INTERNAL',
        status: 'IN_PROGRESS',
        lead_auditor_id: 1
      });
      testAuditId = createAuditRes.body.data.id;
    } else {
      testAuditId = auditsRes.body.data[0].id;
    }
    console.log(`Using Audit ID: ${testAuditId}`);

    // 2. Fetch findings for audit or create a finding
    console.log('\n2. Fetching audit findings for audit...');
    const findingsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${testAuditId}/findings?tenant_id=1`,
      method: 'GET'
    });

    if (findingsRes.status !== 200 || !findingsRes.body.data || findingsRes.body.data.length === 0) {
      console.log('No finding found for audit. Creating temporary test finding...');
      const createFindingRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: `/api/audits/${testAuditId}/findings`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        tenant_id: 1,
        finding_code: `FND-7E-${Date.now().toString().slice(-4)}`,
        title: 'Step 7E CAPA Finding Scope',
        description: 'Test finding for CAPA association',
        severity: 'HIGH',
        status: 'OPEN',
        identified_by: 1,
        identified_date: '2026-09-26'
      });
      testFindingId = createFindingRes.body.data.id;
    } else {
      testFindingId = findingsRes.body.data[0].id;
    }
    console.log(`Using Finding ID: ${testFindingId}`);

    // 3. GET CAPAs by finding (Initial check)
    console.log('\n3. GET /api/findings/:findingId/capa (Initial check)...');
    const initialCapaRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/findings/${testFindingId}/capa?tenant_id=1`,
      method: 'GET'
    });
    console.log(`Initial CAPAs count for finding ${testFindingId}: ${initialCapaRes.body.data.length}`);

    // 4. POST Create CAPA
    console.log('\n4. POST /api/findings/:findingId/capa (Create CAPA)...');
    const createCapaPayload = {
      tenant_id: 1,
      capa_code: testCapaCode,
      action_plan: 'Update network access control lists and apply mandatory patch.',
      owner_id: 1,
      due_date: '2026-10-15',
      status: 'ASSIGNED'
    };

    const createCapaRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/findings/${testFindingId}/capa`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, createCapaPayload);

    if (createCapaRes.status !== 201) {
      throw new Error(`Failed to create CAPA: ${JSON.stringify(createCapaRes.body)}`);
    }

    createdCapaId = createCapaRes.body.data.id;
    console.log(`CAPA created successfully. ID: ${createdCapaId}, Code: ${createCapaRes.body.data.capa_code}`);

    // 5. PUT Update CAPA action plan & status to IN_PROGRESS
    console.log('\n5. PUT /api/capa/:id (Update action plan & status)...');
    const updateRes1 = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/capa/${createdCapaId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      action_plan: 'Update network access control lists and apply mandatory patch (In progress).',
      status: 'IN_PROGRESS'
    });

    if (updateRes1.status !== 200) {
      throw new Error(`Failed to update CAPA status to IN_PROGRESS: ${JSON.stringify(updateRes1.body)}`);
    }
    console.log(`Updated status to: ${updateRes1.body.data.status}`);

    // 6. Test status VERIFIED without verifier details (should fail)
    console.log('\n6. Testing status VERIFIED without verifier details (Validation check)...');
    const invalidVerifyRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/capa/${createdCapaId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      status: 'VERIFIED'
    });

    if (invalidVerifyRes.status === 400 && invalidVerifyRes.body.error) {
      console.log(`Verification validation blocked correctly (400) with error: "${invalidVerifyRes.body.error}"`);
    } else {
      throw new Error(`Expected 400 validation error for VERIFIED status without verifier, got ${invalidVerifyRes.status}`);
    }

    // 7. Test status VERIFIED with verified_by + verified_at (should succeed)
    console.log('\n7. Testing status VERIFIED with verified_by & verified_at...');
    const validVerifyRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/capa/${createdCapaId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      status: 'VERIFIED',
      verified_by: 1,
      verified_at: '2026-09-26',
      verification_notes: 'Patch deployment verified by security auditor.'
    });

    if (validVerifyRes.status !== 200) {
      throw new Error(`Failed to verify CAPA: ${JSON.stringify(validVerifyRes.body)}`);
    }
    console.log(`VERIFIED status set successfully. Verifier ID: ${validVerifyRes.body.data.verified_by}`);

    // 8. Test status CLOSED without completion_date (should fail)
    console.log('\n8. Testing status CLOSED without completion_date...');
    const invalidCloseRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/capa/${createdCapaId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      status: 'CLOSED',
      completion_date: null
    });

    if (invalidCloseRes.status === 400 && invalidCloseRes.body.error) {
      console.log(`Closure validation blocked correctly (400) with error: "${invalidCloseRes.body.error}"`);
    } else {
      throw new Error(`Expected 400 validation error for CLOSED status without completion_date, got ${invalidCloseRes.status}`);
    }

    // 9. Test status CLOSED with completion_date (should succeed)
    console.log('\n9. Testing status CLOSED with completion_date...');
    const validCloseRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/capa/${createdCapaId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      status: 'CLOSED',
      completion_date: '2026-09-26'
    });

    if (validCloseRes.status !== 200) {
      throw new Error(`Failed to close CAPA: ${JSON.stringify(validCloseRes.body)}`);
    }
    console.log(`CLOSED status set successfully. Completion date: ${validCloseRes.body.data.completion_date}`);

    // 10. Regression Check on existing endpoints
    console.log('\n10. Running regression check on existing APIs...');
    const overviewRes = await request({ hostname: 'localhost', port: 5000, path: `/api/audits/${testAuditId}?tenant_id=1`, method: 'GET' });
    const teamRes = await request({ hostname: 'localhost', port: 5000, path: `/api/audits/${testAuditId}/team?tenant_id=1`, method: 'GET' });
    const findingsRes2 = await request({ hostname: 'localhost', port: 5000, path: `/api/audits/${testAuditId}/findings?tenant_id=1`, method: 'GET' });
    const evidenceRes = await request({ hostname: 'localhost', port: 5000, path: `/api/audits/${testAuditId}/evidence?tenant_id=1`, method: 'GET' });

    console.log(`- Audit Overview API: Status ${overviewRes.status}`);
    console.log(`- Audit Team API: Status ${teamRes.status}`);
    console.log(`- Audit Findings API: Status ${findingsRes2.status}`);
    console.log(`- Evidence API: Status ${evidenceRes.status}`);

    if (overviewRes.status !== 200 || teamRes.status !== 200 || findingsRes2.status !== 200 || evidenceRes.status !== 200) {
      throw new Error('Regression detected in existing APIs!');
    }

    // 11. DELETE Soft Delete CAPA
    console.log('\n11. DELETE /api/capa/:id (Soft Delete)...');
    const deleteRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/capa/${createdCapaId}?tenant_id=1`,
      method: 'DELETE'
    });

    if (deleteRes.status !== 200) {
      throw new Error(`Failed to delete CAPA: ${JSON.stringify(deleteRes.body)}`);
    }
    console.log('CAPA deleted successfully (soft delete).');

    // Verify deletion in list
    const postDeleteListRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/findings/${testFindingId}/capa?tenant_id=1`,
      method: 'GET'
    });
    const foundDeleted = postDeleteListRes.body.data.find(c => c.id === createdCapaId);
    if (foundDeleted) {
      throw new Error('Deleted CAPA still appeared in active CAPAs list!');
    }
    console.log('Verified: Soft deleted CAPA is omitted from finding CAPAs list.');

    console.log('\n✅ ALL STEP 7E CAPA INTEGRATION TESTS PASSED PERFECTLY!');

  } catch (err) {
    console.error('\n❌ STEP 7E TEST FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
