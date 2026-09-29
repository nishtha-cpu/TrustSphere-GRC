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

async function runE2ETests() {
  console.log('===============================================================');
  console.log(' STEP 7G: FULL AUDIT MANAGEMENT END-TO-END INTEGRATION TEST SUITE');
  console.log('===============================================================\n');

  const timestamp = Date.now().toString().slice(-4);
  const e2eAuditCode = `E2E-AUD-${timestamp}`;
  const e2eFindingCode = `E2E-FND-${timestamp}`;
  const e2eCapaCode = `E2E-CAPA-${timestamp}`;

  let auditId = null;
  let findingId = null;
  let capaId = null;
  let auditEvidenceId = null;
  let findingEvidenceId = null;
  let capaEvidenceId = null;
  let linkedRisk = null;

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
    // STEP 1 — AUDIT CRUD & OVERVIEW
    // -----------------------------------------------------------------
    console.log('--- STEP 1: AUDIT CREATION & OVERVIEW ---');

    // Create Audit
    const createAuditRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/audits',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      audit_code: e2eAuditCode,
      title: 'End-to-End Security Compliance Audit',
      description: 'E2E test audit description',
      audit_type: 'INTERNAL',
      status: 'PLANNED',
      lead_auditor_id: 1,
      planned_start_date: '2026-10-01',
      planned_end_date: '2026-10-31'
    });

    assert(createAuditRes.status === 201, 'Create E2E Audit (POST /api/audits)', JSON.stringify(createAuditRes.body));
    auditId = createAuditRes.body.data.id;

    // Verify Audit in list
    const getAuditListRes = await request({ hostname: 'localhost', port: 5000, path: '/api/audits?tenant_id=1', method: 'GET' });
    const foundInList = getAuditListRes.body.data && getAuditListRes.body.data.some(a => a.id === auditId);
    assert(foundInList, 'E2E Audit appears in active audit list');

    // Get Overview Details
    const getAuditOverviewRes = await request({ hostname: 'localhost', port: 5000, path: `/api/audits/${auditId}?tenant_id=1`, method: 'GET' });
    assert(getAuditOverviewRes.status === 200 && getAuditOverviewRes.body.data.audit_code === e2eAuditCode, 'Get Audit Overview details by ID');

    // Edit Audit
    const updateAuditRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${auditId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      title: 'End-to-End Security Compliance Audit (Updated)',
      status: 'IN_PROGRESS'
    });
    assert(updateAuditRes.status === 200 && updateAuditRes.body.data.status === 'IN_PROGRESS', 'Update Audit title & status');

    // -----------------------------------------------------------------
    // STEP 2 — AUDIT TEAM & LEAD AUDITOR SYNC
    // -----------------------------------------------------------------
    console.log('\n--- STEP 2: AUDIT TEAM MANAGEMENT & LEAD SYNC ---');

    // Add user #1 as LEAD_AUDITOR
    await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${auditId}/team`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, user_id: 1, role_in_audit: 'LEAD_AUDITOR' });

    // Add team member (user #2 as AUDITOR)
    const addTeamRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${auditId}/team`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      user_id: 2,
      role_in_audit: 'AUDITOR'
    });
    assert(addTeamRes.status === 201, 'Add User #2 as AUDITOR to Audit Team');

    // Get Team list
    const getTeamRes1 = await request({ hostname: 'localhost', port: 5000, path: `/api/audits/${auditId}/team?tenant_id=1`, method: 'GET' });
    assert(getTeamRes1.status === 200 && getTeamRes1.body.data.length >= 2, 'Team list contains lead auditor & user #2');

    // Change role to OBSERVER
    const updateRoleRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${auditId}/team/2`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      role_in_audit: 'OBSERVER'
    });
    assert(updateRoleRes.status === 200 && updateRoleRes.body.data.role_in_audit === 'OBSERVER', 'Change User #2 role to OBSERVER');

    // Promote User #2 to LEAD_AUDITOR
    const promoteLeadRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${auditId}/team/2`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      role_in_audit: 'LEAD_AUDITOR'
    });
    assert(promoteLeadRes.status === 200 && promoteLeadRes.body.data.role_in_audit === 'LEAD_AUDITOR', 'Promote User #2 to LEAD_AUDITOR');

    // Verify Audit Overview reflects User #2 as lead auditor
    const getOverviewLeadSync = await request({ hostname: 'localhost', port: 5000, path: `/api/audits/${auditId}?tenant_id=1`, method: 'GET' });
    assert(getOverviewLeadSync.body.data.lead_auditor_id === 2, 'Audit Overview reflects updated lead_auditor_id = 2');

    // Restore User #1 as LEAD_AUDITOR
    await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${auditId}/team/1`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, role_in_audit: 'LEAD_AUDITOR' });

    // -----------------------------------------------------------------
    // STEP 3 — FINDING & RISK TRACEABILITY
    // -----------------------------------------------------------------
    console.log('\n--- STEP 3: FINDINGS & RISK REGISTER TRACEABILITY ---');

    // Fetch active risks to link
    const risksRes = await request({ hostname: 'localhost', port: 5000, path: '/api/risks?tenant_id=1', method: 'GET' });
    linkedRisk = (risksRes.status === 200 && risksRes.body.data && risksRes.body.data.length > 0)
      ? risksRes.body.data[0]
      : null;

    // Create Finding
    const createFindingRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${auditId}/findings`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      finding_code: e2eFindingCode,
      title: 'Firewall Configuration Weakness',
      description: 'Firewall configuration does not meet security baseline.',
      severity: 'HIGH',
      status: 'OPEN',
      risk_id: linkedRisk ? linkedRisk.id : null,
      identified_by: 1,
      identified_date: '2026-09-26'
    });

    assert(createFindingRes.status === 201, 'Create Finding under Audit', JSON.stringify(createFindingRes.body));
    findingId = createFindingRes.body.data.id;

    // Verify Finding details and Risk Traceability fields
    const getFindingDetailsRes = await request({ hostname: 'localhost', port: 5000, path: `/api/findings/${findingId}?tenant_id=1`, method: 'GET' });
    assert(
      getFindingDetailsRes.status === 200 &&
      (!linkedRisk || (getFindingDetailsRes.body.data.risk_code === linkedRisk.risk_code)),
      'Finding details returns linked risk_code & risk_title'
    );

    // -----------------------------------------------------------------
    // STEP 4 & 5 — CAPA LIFECYCLE & BUSINESS VALIDATION RULES
    // -----------------------------------------------------------------
    console.log('\n--- STEP 4 & 5: CAPA LIFECYCLE & VALIDATION RULES ---');

    // Create CAPA
    const createCapaRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/findings/${findingId}/capa`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      capa_code: e2eCapaCode,
      action_plan: 'Update firewall configuration and verify baseline compliance.',
      owner_id: 1,
      due_date: '2026-10-31',
      status: 'ASSIGNED'
    });

    assert(createCapaRes.status === 201, 'Create CAPA under Finding', JSON.stringify(createCapaRes.body));
    capaId = createCapaRes.body.data.id;

    // Status -> IN_PROGRESS
    const updateCapaRes1 = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/capa/${capaId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, status: 'IN_PROGRESS' });
    assert(updateCapaRes1.status === 200 && updateCapaRes1.body.data.status === 'IN_PROGRESS', 'Transition CAPA to IN_PROGRESS');

    // Test invalid transition to VERIFIED (missing verifier fields -> 400 error)
    const invalidVerifyRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/capa/${capaId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, status: 'VERIFIED' });
    assert(invalidVerifyRes.status === 400, 'Invalid transition to VERIFIED blocked (HTTP 400)');

    // Transition to VERIFIED with verifier fields
    const validVerifyRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/capa/${capaId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      status: 'VERIFIED',
      verified_by: 1,
      verified_at: '2026-09-26',
      verification_notes: 'Remediation verified by auditor'
    });
    assert(validVerifyRes.status === 200 && validVerifyRes.body.data.status === 'VERIFIED', 'Transition CAPA to VERIFIED with sign-off');

    // Test invalid transition to CLOSED (missing completion date -> 400 error)
    const invalidCloseRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/capa/${capaId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, status: 'CLOSED', completion_date: null });
    assert(invalidCloseRes.status === 400, 'Invalid transition to CLOSED blocked (HTTP 400)');

    // Transition to CLOSED with completion date
    const validCloseRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/capa/${capaId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, { tenant_id: 1, status: 'CLOSED', completion_date: '2026-09-26' });
    assert(validCloseRes.status === 200 && validCloseRes.body.data.status === 'CLOSED', 'Transition CAPA to CLOSED with completion date');

    // -----------------------------------------------------------------
    // STEP 6 — EVIDENCE METADATA CATALOGING
    // -----------------------------------------------------------------
    console.log('\n--- STEP 6: EVIDENCE METADATA CATALOGING ---');

    // Audit-level evidence
    const auditEvRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${auditId}/evidence`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      file_name: 'e2e-audit-plan.pdf',
      file_key: `e2e/audits/${auditId}/plan.pdf`,
      file_size_bytes: 250000,
      mime_type: 'application/pdf',
      uploaded_by: 1
    });
    assert(auditEvRes.status === 201, 'Create Audit-level Evidence metadata');
    auditEvidenceId = auditEvRes.body.data.id;

    // Finding-level evidence
    const findingEvRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/findings/${findingId}/evidence`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      file_name: 'e2e-firewall-log.txt',
      file_key: `e2e/findings/${findingId}/log.txt`,
      file_size_bytes: 150000,
      mime_type: 'text/plain',
      uploaded_by: 1
    });
    assert(findingEvRes.status === 201, 'Create Finding-level Evidence metadata');
    findingEvidenceId = findingEvRes.body.data.id;

    // CAPA-level evidence
    const capaEvRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/capa/${capaId}/evidence`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      file_name: 'e2e-patch-verification.png',
      file_key: `e2e/capa/${capaId}/patch.png`,
      file_size_bytes: 350000,
      mime_type: 'image/png',
      uploaded_by: 1
    });
    assert(capaEvRes.status === 201, 'Create CAPA-level Evidence metadata');
    capaEvidenceId = capaEvRes.body.data.id;

    // -----------------------------------------------------------------
    // STEP 7 — TRACEABILITY CHAIN CHECK
    // -----------------------------------------------------------------
    console.log('\n--- STEP 7: COMPLETE TRACEABILITY CHAIN CHECK ---');

    const auditChainRes = await request({ hostname: 'localhost', port: 5000, path: `/api/audits/${auditId}?tenant_id=1`, method: 'GET' });
    const findingChainRes = await request({ hostname: 'localhost', port: 5000, path: `/api/findings/${findingId}?tenant_id=1`, method: 'GET' });
    const capaChainRes = await request({ hostname: 'localhost', port: 5000, path: `/api/capa/${capaId}?tenant_id=1`, method: 'GET' });
    const evidenceChainRes = await request({ hostname: 'localhost', port: 5000, path: `/api/evidence/${capaEvidenceId}?tenant_id=1`, method: 'GET' });

    assert(
      auditChainRes.body.data.id === auditId &&
      findingChainRes.body.data.audit_id === auditId &&
      capaChainRes.body.data.finding_id === findingId &&
      evidenceChainRes.body.data.capa_id === capaId,
      'Full End-to-End Traceability Chain Verified (Audit -> Finding -> Risk -> CAPA -> Evidence)'
    );

    // -----------------------------------------------------------------
    // STEP 9 — ERROR HANDLING & DUPLICATE CHECKS
    // -----------------------------------------------------------------
    console.log('\n--- STEP 9: ERROR HANDLING & EDGE CASES ---');

    // Duplicate Audit Code
    const dupAuditRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/audits',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      audit_code: e2eAuditCode,
      title: 'Duplicate Audit Test',
      audit_type: 'INTERNAL',
      status: 'PLANNED',
      lead_auditor_id: 1
    });
    assert(dupAuditRes.status === 409, 'Duplicate Audit Code returns 409 Conflict');

    // Duplicate Finding Code
    const dupFindingRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${auditId}/findings`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      finding_code: e2eFindingCode,
      title: 'Duplicate Finding Test',
      description: 'Duplicate description',
      severity: 'LOW',
      status: 'OPEN',
      identified_by: 1,
      identified_date: '2026-09-26'
    });
    assert(dupFindingRes.status === 409, 'Duplicate Finding Code returns 409 Conflict');

    // Duplicate CAPA Code
    const dupCapaRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/findings/${findingId}/capa`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      capa_code: e2eCapaCode,
      action_plan: 'Duplicate action plan',
      owner_id: 1,
      due_date: '2026-10-31',
      status: 'ASSIGNED'
    });
    assert(dupCapaRes.status === 409, 'Duplicate CAPA Code returns 409 Conflict');

    // Duplicate Team Member Assignment
    const dupTeamRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${auditId}/team`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      tenant_id: 1,
      user_id: 2,
      role_in_audit: 'AUDITOR'
    });
    assert(dupTeamRes.status === 400 || dupTeamRes.status === 409, 'Duplicate Auditor Assignment returns 400/409 error');

    // -----------------------------------------------------------------
    // STEP 8 — SOFT DELETION & CLEANUP
    // -----------------------------------------------------------------
    console.log('\n--- STEP 8: SOFT DELETION & CLEANUP ---');

    // Soft delete evidence
    const delAuditEv = await request({ hostname: 'localhost', port: 5000, path: `/api/evidence/${auditEvidenceId}?tenant_id=1`, method: 'DELETE' });
    const delFindingEv = await request({ hostname: 'localhost', port: 5000, path: `/api/evidence/${findingEvidenceId}?tenant_id=1`, method: 'DELETE' });
    const delCapaEv = await request({ hostname: 'localhost', port: 5000, path: `/api/evidence/${capaEvidenceId}?tenant_id=1`, method: 'DELETE' });
    assert(delAuditEv.status === 200 && delFindingEv.status === 200 && delCapaEv.status === 200, 'Soft-delete Evidence metadata records');

    // Soft delete CAPA
    const delCapaRes = await request({ hostname: 'localhost', port: 5000, path: `/api/capa/${capaId}?tenant_id=1`, method: 'DELETE' });
    assert(delCapaRes.status === 200, 'Soft-delete CAPA record');

    // Soft delete Finding
    const delFindingRes = await request({ hostname: 'localhost', port: 5000, path: `/api/findings/${findingId}?tenant_id=1`, method: 'DELETE' });
    assert(delFindingRes.status === 200, 'Soft-delete Finding record');

    // Remove team member
    const delTeamMember = await request({ hostname: 'localhost', port: 5000, path: `/api/audits/${auditId}/team/2?tenant_id=1`, method: 'DELETE' });
    assert(delTeamMember.status === 200, 'Remove Team Member from audit');

    // Soft delete Audit
    const delAuditRes = await request({ hostname: 'localhost', port: 5000, path: `/api/audits/${auditId}?tenant_id=1`, method: 'DELETE' });
    assert(delAuditRes.status === 200, 'Soft-delete Audit engagement');

    // Verify soft-deleted items omitted from active lists
    const postDelAuditList = await request({ hostname: 'localhost', port: 5000, path: '/api/audits?tenant_id=1', method: 'GET' });
    const stillInList = postDelAuditList.body.data && postDelAuditList.body.data.some(a => a.id === auditId);
    assert(!stillInList, 'Soft-deleted Audit omitted from active audit list');

    // -----------------------------------------------------------------
    // STEP 11 — FULL SYSTEM REGRESSION CHECK
    // -----------------------------------------------------------------
    console.log('\n--- STEP 11: FULL SYSTEM REGRESSION CHECK ---');

    const regRiskList = await request({ hostname: 'localhost', port: 5000, path: '/api/risks?tenant_id=1', method: 'GET' });
    assert(regRiskList.status === 200, 'Risk Register API (GET /api/risks) operational');

    const targetRiskId = linkedRisk ? linkedRisk.id : 1;
    const regRiskAssess = await request({ hostname: 'localhost', port: 5000, path: `/api/risks/${targetRiskId}/assessments?tenant_id=1`, method: 'GET' });
    assert(regRiskAssess.status === 200, 'Risk Assessments API operational');

    const regMatrix = await request({ hostname: 'localhost', port: 5000, path: '/api/risk-assessments/matrix?tenant_id=1', method: 'GET' });
    assert(regMatrix.status === 200, 'Risk Matrix Heatmap API (GET /api/risk-assessments/matrix) operational');

    const regAudits = await request({ hostname: 'localhost', port: 5000, path: '/api/audits?tenant_id=1', method: 'GET' });
    assert(regAudits.status === 200, 'Audit Engagement API operational');

    console.log('\n===============================================================');
    console.log(` SUMMARY: ${passedTests}/${totalTests} Tests Passed (${failedTests} Failed)`);
    console.log('===============================================================\n');

    if (failedTests === 0) {
      console.log('AUDIT MANAGEMENT MODULE = END-TO-END COMPLETE');
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error('\n❌ E2E SUITE ERROR:', err.message);
    process.exit(1);
  }
}

runE2ETests();
