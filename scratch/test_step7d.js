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
  console.log('=== STEP 7D REACT FRONTEND & INTEGRATION TEST SUITE ===\n');
  let testAuditId = null;
  let createdFindingId = null;
  const testFindingCode = `FND-7D-${Date.now().toString().slice(-4)}`;

  try {
    // 1. Fetch audits to get an auditId
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
        audit_code: `AUD-7D-${Date.now().toString().slice(-4)}`,
        title: 'Step 7D Integration Test Audit',
        audit_type: 'INTERNAL',
        status: 'IN_PROGRESS',
        lead_auditor_id: 1
      });
      testAuditId = createAuditRes.body.data.id;
    } else {
      testAuditId = auditsRes.body.data[0].id;
    }
    console.log(`Using Audit ID: ${testAuditId}`);

    // 2. Fetch risks to link
    console.log('\n2. Fetching risk register for traceability link...');
    const risksRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/risks?tenant_id=1',
      method: 'GET'
    });

    const testRisk = (risksRes.status === 200 && risksRes.body.data && risksRes.body.data.length > 0)
      ? risksRes.body.data[0]
      : null;

    console.log(testRisk ? `Linking to Risk: ${testRisk.risk_code} (ID: ${testRisk.id})` : 'No risks found to link, testing with null risk_id');

    // 3. GET Findings for selected audit
    console.log('\n3. GET /api/audits/:auditId/findings (Initial load)...');
    const initialFindingsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${testAuditId}/findings?tenant_id=1`,
      method: 'GET'
    });
    console.log(`Initial findings count: ${initialFindingsRes.body.data.length}`);

    // 4. POST Create Finding
    console.log('\n4. POST /api/audits/:auditId/findings (Create Finding)...');
    const createFindingPayload = {
      tenant_id: 1,
      finding_code: testFindingCode,
      title: 'Missing Multi-Factor Authentication',
      description: 'MFA is not enforced on administrative web portals.',
      severity: 'HIGH',
      status: 'OPEN',
      risk_id: testRisk ? testRisk.id : null,
      identified_by: 1,
      identified_date: '2026-09-26'
    };

    const createFindingRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${testAuditId}/findings`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, createFindingPayload);

    if (createFindingRes.status !== 201) {
      throw new Error(`Failed to create finding: ${JSON.stringify(createFindingRes.body)}`);
    }

    createdFindingId = createFindingRes.body.data.id;
    console.log(`Finding created successfully. ID: ${createdFindingId}, Code: ${createFindingRes.body.data.finding_code}`);

    // 5. GET Finding by ID and check risk traceability fields
    console.log('\n5. GET /api/findings/:id (Verify Risk Traceability)...');
    const getFindingRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/findings/${createdFindingId}?tenant_id=1`,
      method: 'GET'
    });

    console.log(`Severity: ${getFindingRes.body.data.severity}, Status: ${getFindingRes.body.data.status}`);
    if (testRisk) {
      console.log(`Related Risk Code: ${getFindingRes.body.data.risk_code}`);
      console.log(`Related Risk Title: ${getFindingRes.body.data.risk_title}`);
      if (!getFindingRes.body.data.risk_code) {
        throw new Error('Risk traceability failed: risk_code not returned in finding details');
      }
    }

    // 6. PUT Edit Finding
    console.log('\n6. PUT /api/findings/:id (Edit Finding)...');
    const updatePayload = {
      tenant_id: 1,
      finding_code: testFindingCode, // code should be preserved
      title: 'Missing MFA on Admin Portals (Updated)',
      description: 'MFA is not enforced on administrative web portals. Remediation in progress.',
      severity: 'CRITICAL',
      status: 'IN_REMEDIATION',
      risk_id: testRisk ? testRisk.id : null,
      identified_by: 1,
      identified_date: '2026-09-26'
    };

    const updateFindingRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/findings/${createdFindingId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, updatePayload);

    if (updateFindingRes.status !== 200) {
      throw new Error(`Failed to update finding: ${JSON.stringify(updateFindingRes.body)}`);
    }
    console.log(`Finding updated successfully. New Severity: ${updateFindingRes.body.data.severity}, New Status: ${updateFindingRes.body.data.status}`);

    // 7. Duplicate finding_code validation test
    console.log('\n7. Testing duplicate finding_code validation...');
    const dupRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${testAuditId}/findings`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, createFindingPayload);

    if ((dupRes.status === 400 || dupRes.status === 409) && dupRes.body.error) {
      console.log(`Duplicate code blocked as expected (${dupRes.status}) with error: "${dupRes.body.error}"`);
    } else {
      throw new Error(`Expected 400/409 duplicate error, got: ${dupRes.status} ${JSON.stringify(dupRes.body)}`);
    }

    // 8. Running regression check on existing APIs
    console.log('\n8. Running regression check on existing APIs...');
    const overviewRes = await request({ hostname: 'localhost', port: 5000, path: `/api/audits/${testAuditId}?tenant_id=1`, method: 'GET' });
    const teamRes = await request({ hostname: 'localhost', port: 5000, path: `/api/audits/${testAuditId}/team?tenant_id=1`, method: 'GET' });
    const capaRes = await request({ hostname: 'localhost', port: 5000, path: `/api/findings/${createdFindingId}/capa?tenant_id=1`, method: 'GET' });
    const evidenceRes = await request({ hostname: 'localhost', port: 5000, path: `/api/audits/${testAuditId}/evidence?tenant_id=1`, method: 'GET' });

    console.log(`- Audit Overview API: Status ${overviewRes.status}`);
    console.log(`- Audit Team API: Status ${teamRes.status}`);
    console.log(`- CAPA API: Status ${capaRes.status}`);
    console.log(`- Evidence API: Status ${evidenceRes.status}`);

    if (overviewRes.status !== 200 || teamRes.status !== 200 || capaRes.status !== 200 || evidenceRes.status !== 200) {
      throw new Error('Regression detected in existing APIs!');
    }

    // 9. DELETE Finding (soft delete)
    console.log('\n9. DELETE /api/findings/:id (Soft Delete)...');
    const deleteRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/findings/${createdFindingId}?tenant_id=1`,
      method: 'DELETE'
    });

    if (deleteRes.status !== 200) {
      throw new Error(`Delete failed: ${JSON.stringify(deleteRes.body)}`);
    }
    console.log('Finding deleted successfully (soft delete).');

    // Verify finding is no longer in audit list
    const postDeleteListRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${testAuditId}/findings?tenant_id=1`,
      method: 'GET'
    });
    const foundDeleted = postDeleteListRes.body.data.find(f => f.id === createdFindingId);
    if (foundDeleted) {
      throw new Error('Deleted finding still appeared in active findings list!');
    }
    console.log('Verified: Deleted finding is omitted from active findings list.');

    console.log('\n✅ ALL STEP 7D INTEGRATION TESTS PASSED PERFECTLY!');

  } catch (err) {
    console.error('\n❌ STEP 7D TEST FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
