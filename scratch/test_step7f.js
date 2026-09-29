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
  console.log('=== STEP 7F EVIDENCE METADATA REACT FRONTEND & INTEGRATION TEST SUITE ===\n');

  let testAuditId = null;
  let testFindingId = null;
  let testCapaId = null;

  let createdAuditEvId = null;
  let createdFindingEvId = null;
  let createdCapaEvId = null;

  const timestamp = Date.now().toString().slice(-4);

  try {
    // 1. Fetch or create test Audit
    console.log('1. Fetching active audits list...');
    const auditsRes = await request({ hostname: 'localhost', port: 5000, path: '/api/audits?tenant_id=1', method: 'GET' });

    if (auditsRes.status !== 200 || !auditsRes.body.data || auditsRes.body.data.length === 0) {
      const createAuditRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/audits',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        tenant_id: 1,
        audit_code: `AUD-7F-${timestamp}`,
        title: 'Step 7F Evidence Integration Test Audit',
        audit_type: 'INTERNAL',
        status: 'IN_PROGRESS',
        lead_auditor_id: 1
      });
      testAuditId = createAuditRes.body.data.id;
    } else {
      testAuditId = auditsRes.body.data[0].id;
    }
    console.log(`Using Audit ID: ${testAuditId}`);

    // 2. Fetch or create test Finding
    console.log('\n2. Fetching audit findings...');
    const findingsRes = await request({ hostname: 'localhost', port: 5000, path: `/api/audits/${testAuditId}/findings?tenant_id=1`, method: 'GET' });

    if (findingsRes.status !== 200 || !findingsRes.body.data || findingsRes.body.data.length === 0) {
      const createFindingRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: `/api/audits/${testAuditId}/findings`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        tenant_id: 1,
        finding_code: `FND-7F-${timestamp}`,
        title: 'Step 7F Evidence Finding Scope',
        description: 'Finding scope for evidence testing',
        severity: 'MEDIUM',
        status: 'OPEN',
        identified_by: 1,
        identified_date: '2026-09-26'
      });
      testFindingId = createFindingRes.body.data.id;
    } else {
      testFindingId = findingsRes.body.data[0].id;
    }
    console.log(`Using Finding ID: ${testFindingId}`);

    // 3. Fetch or create test CAPA
    console.log('\n3. Fetching CAPAs for finding...');
    const capasRes = await request({ hostname: 'localhost', port: 5000, path: `/api/findings/${testFindingId}/capa?tenant_id=1`, method: 'GET' });

    if (capasRes.status !== 200 || !capasRes.body.data || capasRes.body.data.length === 0) {
      const createCapaRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: `/api/findings/${testFindingId}/capa`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        tenant_id: 1,
        capa_code: `CAPA-7F-${timestamp}`,
        action_plan: 'CAPA action plan for evidence testing',
        owner_id: 1,
        due_date: '2026-10-30',
        status: 'ASSIGNED'
      });
      testCapaId = createCapaRes.body.data.id;
    } else {
      testCapaId = capasRes.body.data[0].id;
    }
    console.log(`Using CAPA ID: ${testCapaId}`);

    // 4. POST Create Audit-Level Evidence Metadata
    console.log('\n4. POST /api/audits/:auditId/evidence (Add Audit-Level Evidence Metadata)...');
    const auditEvRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${testAuditId}/evidence`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      file_name: `Audit_Plan_${timestamp}.pdf`,
      file_key: `s3://trustsphere-evidence/2026/audits/${testAuditId}/plan.pdf`,
      file_size_bytes: 1048576,
      mime_type: 'application/pdf',
      uploaded_by: 1
    });

    if (auditEvRes.status !== 201) {
      throw new Error(`Failed to create audit evidence: ${JSON.stringify(auditEvRes.body)}`);
    }
    createdAuditEvId = auditEvRes.body.data.id;
    console.log(`Audit evidence created. ID: ${createdAuditEvId}, File: ${auditEvRes.body.data.file_name}`);

    // 5. POST Create Finding-Level Evidence Metadata
    console.log('\n5. POST /api/findings/:findingId/evidence (Add Finding-Level Evidence Metadata)...');
    const findingEvRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/findings/${testFindingId}/evidence`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      file_name: `Firewall_Log_${timestamp}.txt`,
      file_key: `s3://trustsphere-evidence/2026/findings/${testFindingId}/log.txt`,
      file_size_bytes: 512000,
      mime_type: 'text/plain',
      uploaded_by: 1
    });

    if (findingEvRes.status !== 201) {
      throw new Error(`Failed to create finding evidence: ${JSON.stringify(findingEvRes.body)}`);
    }
    createdFindingEvId = findingEvRes.body.data.id;
    console.log(`Finding evidence created. ID: ${createdFindingEvId}, File: ${findingEvRes.body.data.file_name}`);

    // 6. POST Create CAPA-Level Evidence Metadata
    console.log('\n6. POST /api/capa/:capaId/evidence (Add CAPA-Level Evidence Metadata)...');
    const capaEvRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/capa/${testCapaId}/evidence`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      file_name: `Patch_Verification_${timestamp}.png`,
      file_key: `s3://trustsphere-evidence/2026/capa/${testCapaId}/patch.png`,
      file_size_bytes: 204800,
      mime_type: 'image/png',
      uploaded_by: 1
    });

    if (capaEvRes.status !== 201) {
      throw new Error(`Failed to create CAPA evidence: ${JSON.stringify(capaEvRes.body)}`);
    }
    createdCapaEvId = capaEvRes.body.data.id;
    console.log(`CAPA evidence created. ID: ${createdCapaEvId}, File: ${capaEvRes.body.data.file_name}`);

    // 7. GET Evidence Details by ID
    console.log('\n7. GET /api/evidence/:id (Fetch evidence details)...');
    const detailsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/evidence/${createdFindingEvId}?tenant_id=1`,
      method: 'GET'
    });

    if (detailsRes.status !== 200 || !detailsRes.body.data) {
      throw new Error(`Failed to fetch evidence details: ${JSON.stringify(detailsRes.body)}`);
    }
    console.log(`Details fetched successfully. File Key: ${detailsRes.body.data.file_key}, Uploader: ${detailsRes.body.data.uploaded_by_name}`);

    // 8. Validation Test: Reject empty file_name
    console.log('\n8. Testing validation: Reject empty file_name...');
    const invalidNameRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${testAuditId}/evidence`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      file_name: '',
      file_key: 's3://test/key.pdf',
      file_size_bytes: 100,
      mime_type: 'application/pdf',
      uploaded_by: 1
    });

    if (invalidNameRes.status === 400 && invalidNameRes.body.error) {
      console.log(`Empty file_name rejected (400) with error: "${invalidNameRes.body.error}"`);
    } else {
      throw new Error(`Expected 400 validation error for empty file_name, got ${invalidNameRes.status}`);
    }

    // 9. Validation Test: Reject empty file_key
    console.log('\n9. Testing validation: Reject empty file_key...');
    const invalidKeyRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${testAuditId}/evidence`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      file_name: 'test.pdf',
      file_key: '',
      file_size_bytes: 100,
      mime_type: 'application/pdf',
      uploaded_by: 1
    });

    if (invalidKeyRes.status === 400 && invalidKeyRes.body.error) {
      console.log(`Empty file_key rejected (400) with error: "${invalidKeyRes.body.error}"`);
    } else {
      throw new Error(`Expected 400 validation error for empty file_key, got ${invalidKeyRes.status}`);
    }

    // 10. Validation Test: Reject invalid file size
    console.log('\n10. Testing validation: Reject negative file_size_bytes...');
    const invalidSizeRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${testAuditId}/evidence`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      file_name: 'test.pdf',
      file_key: 's3://test/key.pdf',
      file_size_bytes: -50,
      mime_type: 'application/pdf',
      uploaded_by: 1
    });

    if (invalidSizeRes.status === 400 && invalidSizeRes.body.error) {
      console.log(`Negative file size rejected (400) with error: "${invalidSizeRes.body.error}"`);
    } else {
      throw new Error(`Expected 400 validation error for negative file size, got ${invalidSizeRes.status}`);
    }

    // 11. Validation Test: Reject invalid uploader
    console.log('\n11. Testing validation: Reject non-existent uploaded_by...');
    const invalidUserRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${testAuditId}/evidence`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      file_name: 'test.pdf',
      file_key: 's3://test/key.pdf',
      file_size_bytes: 100,
      mime_type: 'application/pdf',
      uploaded_by: 999999
    });

    if (invalidUserRes.status === 400 && invalidUserRes.body.error) {
      console.log(`Invalid user rejected (400) with error: "${invalidUserRes.body.error}"`);
    } else {
      throw new Error(`Expected 400 validation error for invalid uploader, got ${invalidUserRes.status}`);
    }

    // 12. Soft Delete Evidence Metadata
    console.log('\n12. DELETE /api/evidence/:id (Soft Delete Audit Evidence)...');
    const deleteRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/evidence/${createdAuditEvId}?tenant_id=1`,
      method: 'DELETE'
    });

    if (deleteRes.status !== 200) {
      throw new Error(`Failed to delete evidence: ${JSON.stringify(deleteRes.body)}`);
    }
    console.log('Audit evidence metadata record deleted successfully (soft delete).');

    // Clean up test finding & CAPA evidence records
    await request({ hostname: 'localhost', port: 5000, path: `/api/evidence/${createdFindingEvId}?tenant_id=1`, method: 'DELETE' });
    await request({ hostname: 'localhost', port: 5000, path: `/api/evidence/${createdCapaEvId}?tenant_id=1`, method: 'DELETE' });
    console.log('Temporary evidence records cleaned up.');

    // 13. Full System Regression Check
    console.log('\n13. Running full system regression check on existing modules...');
    const overviewRes = await request({ hostname: 'localhost', port: 5000, path: `/api/audits/${testAuditId}?tenant_id=1`, method: 'GET' });
    const teamRes = await request({ hostname: 'localhost', port: 5000, path: `/api/audits/${testAuditId}/team?tenant_id=1`, method: 'GET' });
    const findingsCheckRes = await request({ hostname: 'localhost', port: 5000, path: `/api/audits/${testAuditId}/findings?tenant_id=1`, method: 'GET' });
    const capasCheckRes = await request({ hostname: 'localhost', port: 5000, path: `/api/findings/${testFindingId}/capa?tenant_id=1`, method: 'GET' });
    const risksRes = await request({ hostname: 'localhost', port: 5000, path: '/api/risks?tenant_id=1', method: 'GET' });
    const assessmentsRes = await request({ hostname: 'localhost', port: 5000, path: '/api/risk-assessments/matrix?tenant_id=1', method: 'GET' });

    console.log(`- Audit Overview API: Status ${overviewRes.status}`);
    console.log(`- Audit Team API: Status ${teamRes.status}`);
    console.log(`- Audit Findings API: Status ${findingsCheckRes.status}`);
    console.log(`- CAPA API: Status ${capasCheckRes.status}`);
    console.log(`- Risk Register API: Status ${risksRes.status}`);
    console.log(`- Risk Assessment / Matrix API: Status ${assessmentsRes.status}`);

    if (overviewRes.status === 200 && teamRes.status === 200 && findingsCheckRes.status === 200 && capasCheckRes.status === 200 && risksRes.status === 200 && assessmentsRes.status === 200) {
      console.log('\n✅ ALL STEP 7F EVIDENCE METADATA INTEGRATION TESTS PASSED PERFECTLY!');
    } else {
      throw new Error('Regression detected in existing modules!');
    }

  } catch (err) {
    console.error('\n❌ STEP 7F TEST FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
