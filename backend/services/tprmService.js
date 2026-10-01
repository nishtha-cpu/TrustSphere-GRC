const pool = require('../config/database');
const { logSystemEvent } = require('./systemAuditService');

function calculateTPRMScore(sensitivity, compliance, security, maturity, incidentHistory) {
  const score = Math.round(
    (Number(sensitivity) * 0.25) +
    (Number(compliance) * 0.20) +
    (Number(security) * 0.25) +
    (Number(maturity) * 0.15) +
    (Number(incidentHistory) * 0.15)
  );
  let level = 'LOW';
  if (score >= 75) level = 'CRITICAL';
  else if (score >= 50) level = 'HIGH';
  else if (score >= 25) level = 'MEDIUM';
  return { score, level };
}

async function listVendors(tenantId, filters = {}) {
  let query = `
    SELECT v.*, u.email AS owner_email
    FROM vendors v
    LEFT JOIN users u ON v.owner_id = u.id
    WHERE v.tenant_id = ? AND v.deleted_at IS NULL
  `;
  const params = [tenantId];

  if (filters.status) {
    query += ` AND v.status = ?`;
    params.push(filters.status);
  }

  if (filters.risk_classification) {
    query += ` AND v.risk_classification = ?`;
    params.push(filters.risk_classification);
  }

  if (filters.search) {
    query += ` AND (v.vendor_name LIKE ? OR v.vendor_code LIKE ? OR v.vendor_type LIKE ?)`;
    const pattern = `%${filters.search.trim()}%`;
    params.push(pattern, pattern, pattern);
  }

  query += ` ORDER BY v.id DESC`;
  const [rows] = await pool.query(query, params);
  return rows;
}

async function getVendorById(tenantId, vendorId) {
  const [rows] = await pool.query(
    `SELECT v.*, u.email AS owner_email
     FROM vendors v
     LEFT JOIN users u ON v.owner_id = u.id
     WHERE v.id = ? AND v.tenant_id = ? AND v.deleted_at IS NULL`,
    [vendorId, tenantId]
  );
  if (rows.length === 0) return null;

  const vendor = rows[0];

  const [assessments] = await pool.query(
    `SELECT a.*, u.email AS reviewer_email FROM tprm_assessments a
     LEFT JOIN users u ON a.reviewed_by = u.id
     WHERE a.vendor_id = ? AND a.tenant_id = ? ORDER BY a.id DESC`,
    [vendorId, tenantId]
  );

  const [findings] = await pool.query(
    `SELECT f.*, u.email AS owner_email FROM tprm_findings f
     LEFT JOIN users u ON f.owner_id = u.id
     WHERE f.vendor_id = ? AND f.tenant_id = ? ORDER BY f.id DESC`,
    [vendorId, tenantId]
  );

  vendor.assessments = assessments;
  vendor.findings = findings;
  return vendor;
}

async function createVendor(actingUserId, tenantId, data, reqContext = {}) {
  const {
    vendor_name,
    vendor_type,
    owner_id,
    services_provided,
    data_handled,
    contact_email
  } = data;

  if (!vendor_name || !vendor_name.trim() || !vendor_type || !services_provided || !contact_email) {
    const err = new Error('vendor_name, vendor_type, services_provided, and contact_email are required');
    err.status = 400;
    throw err;
  }

  const vendorCode = `VEND-${Date.now()}`;

  const [res] = await pool.query(
    `INSERT INTO vendors
     (tenant_id, vendor_code, vendor_name, vendor_type, status, owner_id, services_provided, data_handled, risk_classification, contact_email)
     VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?, 'MEDIUM', ?)`,
    [
      tenantId,
      vendorCode,
      vendor_name.trim(),
      vendor_type.trim(),
      owner_id || actingUserId || null,
      services_provided.trim(),
      data_handled || 'Operational Data',
      contact_email.trim()
    ]
  );

  const vendorId = res.insertId;
  await logSystemEvent(tenantId, actingUserId, null, 'CREATE_VENDOR', 'TPRM', 'VENDOR', vendorId, { vendor_name, vendorCode }, reqContext);

  return await getVendorById(tenantId, vendorId);
}

async function createTPRMAssessment(actingUserId, tenantId, vendorId, data, reqContext = {}) {
  const vendor = await getVendorById(tenantId, vendorId);
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.status = 404;
    throw err;
  }

  const {
    sensitivity_score = 50,
    compliance_exposure_score = 50,
    security_controls_score = 50,
    vendor_maturity_score = 50,
    incident_history_score = 50,
    questionnaire_answers
  } = data;

  const { score, level } = calculateTPRMScore(
    sensitivity_score,
    compliance_exposure_score,
    security_controls_score,
    vendor_maturity_score,
    incident_history_score
  );

  const assessmentNumber = `TPRM-${Date.now()}`;

  const [res] = await pool.query(
    `INSERT INTO tprm_assessments
     (tenant_id, assessment_number, vendor_id, sensitivity_score, compliance_exposure_score, security_controls_score, vendor_maturity_score, incident_history_score, overall_risk_score, risk_level, questionnaire_answers, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')`,
    [
      tenantId,
      assessmentNumber,
      vendorId,
      sensitivity_score,
      compliance_exposure_score,
      security_controls_score,
      vendor_maturity_score,
      incident_history_score,
      score,
      level,
      questionnaire_answers ? JSON.stringify(questionnaire_answers) : null
    ]
  );

  // Update vendor overall risk classification
  await pool.query(
    `UPDATE vendors SET risk_classification = ? WHERE id = ? AND tenant_id = ?`,
    [level, vendorId, tenantId]
  );

  await logSystemEvent(tenantId, actingUserId, null, 'CREATE_TPRM_ASSESSMENT', 'TPRM', 'TPRM_ASSESSMENT', res.insertId, { assessmentNumber, score, level }, reqContext);

  return { id: res.insertId, assessment_number: assessmentNumber, vendor_id: vendorId, overall_risk_score: score, risk_level: level, status: 'SUBMITTED' };
}

async function addTPRMFinding(actingUserId, tenantId, vendorId, data) {
  const { assessment_id, finding_title, category, severity = 'MEDIUM', remediation_plan, owner_id } = data;
  if (!finding_title || !category || !remediation_plan) {
    const err = new Error('finding_title, category, and remediation_plan are required');
    err.status = 400;
    throw err;
  }

  const [res] = await pool.query(
    `INSERT INTO tprm_findings
     (tenant_id, assessment_id, vendor_id, finding_title, category, severity, remediation_plan, owner_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
    [
      tenantId,
      assessment_id || 0,
      vendorId,
      finding_title.trim(),
      category.trim(),
      severity,
      remediation_plan.trim(),
      owner_id || actingUserId || null
    ]
  );

  return { id: res.insertId, vendor_id: vendorId, finding_title, severity, status: 'OPEN' };
}

module.exports = {
  listVendors,
  getVendorById,
  createVendor,
  createTPRMAssessment,
  addTPRMFinding
};
