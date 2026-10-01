const pool = require('../config/database');
const { logSystemEvent } = require('./systemAuditService');

/**
 * Calculate DPIA Risk Level based on overall risk score (0 - 100)
 */
function calculateRiskLevel(score) {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

async function listDPIAs(tenantId, filters = {}) {
  let query = `
    SELECT d.*, u1.email AS creator_email, u2.email AS reviewer_email, p.name AS purpose_name, p.purpose_code
    FROM dpia_assessments d
    LEFT JOIN users u1 ON d.created_by = u1.id
    LEFT JOIN users u2 ON d.reviewer_id = u2.id
    LEFT JOIN consent_purposes p ON d.purpose_id = p.id
    WHERE d.tenant_id = ? AND d.deleted_at IS NULL
  `;
  const params = [tenantId];

  if (filters.status) {
    query += ` AND d.status = ?`;
    params.push(filters.status);
  }

  if (filters.risk_level) {
    query += ` AND d.risk_level = ?`;
    params.push(filters.risk_level);
  }

  if (filters.search) {
    query += ` AND (d.title LIKE ? OR d.assessment_number LIKE ?)`;
    const pattern = `%${filters.search.trim()}%`;
    params.push(pattern, pattern);
  }

  query += ` ORDER BY d.id DESC`;
  const [rows] = await pool.query(query, params);
  return rows;
}

async function getDPIAById(tenantId, assessmentId) {
  const [rows] = await pool.query(
    `SELECT d.*, u1.email AS creator_email, u2.email AS reviewer_email, p.name AS purpose_name, p.purpose_code
     FROM dpia_assessments d
     LEFT JOIN users u1 ON d.created_by = u1.id
     LEFT JOIN users u2 ON d.reviewer_id = u2.id
     LEFT JOIN consent_purposes p ON d.purpose_id = p.id
     WHERE d.id = ? AND d.tenant_id = ? AND d.deleted_at IS NULL`,
    [assessmentId, tenantId]
  );
  if (rows.length === 0) return null;

  const dpia = rows[0];

  // Fetch Remediations
  const [remediations] = await pool.query(
    `SELECT r.*, u.email AS owner_email FROM dpia_remediations r
     LEFT JOIN users u ON r.owner_id = u.id
     WHERE r.assessment_id = ? AND r.tenant_id = ?`,
    [assessmentId, tenantId]
  );

  // Fetch History
  const [history] = await pool.query(
    `SELECT h.*, u.email AS performer_email FROM dpia_history h
     LEFT JOIN users u ON h.performed_by = u.id
     WHERE h.assessment_id = ? AND h.tenant_id = ?
     ORDER BY h.performed_at ASC`,
    [assessmentId, tenantId]
  );

  dpia.remediations = remediations;
  dpia.history = history;
  return dpia;
}

async function createDPIA(actingUserId, tenantId, data, reqContext = {}) {
  const {
    title,
    description,
    purpose_id,
    data_collection_score = 10,
    data_processing_score = 10,
    data_sharing_score = 10,
    data_retention_score = 10,
    security_controls_score = 10,
    executive_summary
  } = data;

  if (!title || !title.trim()) {
    const err = new Error('title is required');
    err.status = 400;
    throw err;
  }

  const assessmentNumber = `DPIA-${Date.now()}`;
  const overallRiskScore = Math.round(
    (Number(data_collection_score) +
     Number(data_processing_score) +
     Number(data_sharing_score) +
     Number(data_retention_score) +
     Number(security_controls_score)) / 5
  );
  const riskLevel = calculateRiskLevel(overallRiskScore);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [res] = await connection.query(
      `INSERT INTO dpia_assessments 
       (tenant_id, assessment_number, title, description, purpose_id, status,
        data_collection_score, data_processing_score, data_sharing_score, data_retention_score,
        security_controls_score, overall_risk_score, risk_level, executive_summary, created_by)
       VALUES (?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        assessmentNumber,
        title.trim(),
        description || null,
        purpose_id || null,
        data_collection_score,
        data_processing_score,
        data_sharing_score,
        data_retention_score,
        security_controls_score,
        overallRiskScore,
        riskLevel,
        executive_summary || null,
        actingUserId || null
      ]
    );

    const assessmentId = res.insertId;

    await connection.query(
      `INSERT INTO dpia_history
       (tenant_id, assessment_id, previous_status, new_status, action, performed_by, notes)
       VALUES (?, ?, 'NONE', 'DRAFT', 'DPIA_CREATED', ?, 'Initial assessment created')`,
      [tenantId, assessmentId, actingUserId || null]
    );

    await connection.commit();

    await logSystemEvent(tenantId, actingUserId, null, 'CREATE_DPIA', 'DPIA', 'DPIA', assessmentId, { title, assessmentNumber }, reqContext);

    return await getDPIAById(tenantId, assessmentId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateDPIAStatus(actingUserId, tenantId, assessmentId, bodyData = {}, reqContext = {}) {
  const dpia = await getDPIAById(tenantId, assessmentId);
  if (!dpia) {
    const err = new Error('DPIA assessment not found');
    err.status = 404;
    throw err;
  }

  const { status, reviewer_notes } = bodyData;
  const allowedStatuses = ['IN_REVIEW', 'APPROVED', 'REJECTED', 'REMEDIATION_REQUIRED'];
  if (!allowedStatuses.includes(status)) {
    const err = new Error(`Invalid status transition to ${status}`);
    err.status = 400;
    throw err;
  }

  // Workflow transition guard logic
  if (status === 'IN_REVIEW' && dpia.status !== 'DRAFT' && dpia.status !== 'REMEDIATION_REQUIRED') {
    const err = new Error(`Cannot submit for review from status ${dpia.status}`);
    err.status = 400;
    throw err;
  }
  if (['APPROVED', 'REJECTED', 'REMEDIATION_REQUIRED'].includes(status) && dpia.status !== 'IN_REVIEW') {
    const err = new Error(`Assessment must be IN_REVIEW before transition to ${status}`);
    err.status = 400;
    throw err;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE dpia_assessments
       SET status = ?, reviewer_id = ?, reviewer_notes = ?
       WHERE id = ? AND tenant_id = ?`,
      [status, actingUserId || null, reviewer_notes || null, assessmentId, tenantId]
    );

    await connection.query(
      `INSERT INTO dpia_history
       (tenant_id, assessment_id, previous_status, new_status, action, performed_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, assessmentId, dpia.status, status, `STATUS_CHANGED_TO_${status}`, actingUserId || null, reviewer_notes || `Status updated to ${status}`]
    );

    await connection.commit();

    await logSystemEvent(tenantId, actingUserId, null, 'UPDATE_DPIA_STATUS', 'DPIA', 'DPIA', assessmentId, { from: dpia.status, to: status }, reqContext);

    return await getDPIAById(tenantId, assessmentId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function addDPIARemediation(actingUserId, tenantId, assessmentId, data) {
  const dpia = await getDPIAById(tenantId, assessmentId);
  if (!dpia) {
    const err = new Error('DPIA assessment not found');
    err.status = 404;
    throw err;
  }

  const { risk_item, action_plan, owner_id, target_date } = data;
  if (!risk_item || !action_plan) {
    const err = new Error('risk_item and action_plan are required');
    err.status = 400;
    throw err;
  }

  const [res] = await pool.query(
    `INSERT INTO dpia_remediations
     (tenant_id, assessment_id, risk_item, action_plan, owner_id, target_date, status)
     VALUES (?, ?, ?, ?, ?, ?, 'OPEN')`,
    [tenantId, assessmentId, risk_item, action_plan, owner_id || null, target_date || null]
  );

  return { id: res.insertId, assessment_id: assessmentId, risk_item, action_plan, status: 'OPEN' };
}

module.exports = {
  listDPIAs,
  getDPIAById,
  createDPIA,
  updateDPIAStatus,
  addDPIARemediation
};
