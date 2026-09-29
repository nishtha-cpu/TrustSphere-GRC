const pool = require('../config/database');

/**
 * Service to handle Risk Assessment database operations
 */

async function createAssessment({
  tenant_id,
  risk_id,
  assessor_id,
  assessment_type,
  likelihood_score,
  impact_score,
  risk_level,
  notes
}) {
  const [riskRows] = await pool.query(
    `SELECT id, tenant_id FROM risks WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
    [risk_id, tenant_id]
  );
  if (!riskRows.length) {
    const error = new Error('Risk not found or does not belong to specified tenant');
    error.code = 'ERR_RISK_NOT_FOUND';
    throw error;
  }

  const [userRows] = await pool.query(
    `SELECT id, tenant_id FROM users WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
    [assessor_id, tenant_id]
  );
  if (!userRows.length) {
    const error = new Error('Assessor not found or does not belong to specified tenant');
    error.code = 'ERR_ASSESSOR_NOT_FOUND';
    throw error;
  }

  const query = `
    INSERT INTO risk_assessments
      (tenant_id, risk_id, assessor_id, assessment_type, likelihood_score, impact_score, risk_level, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.query(query, [
    tenant_id,
    risk_id,
    assessor_id,
    assessment_type,
    likelihood_score,
    impact_score,
    risk_level,
    notes || null
  ]);

  return getAssessmentById(result.insertId, tenant_id);
}

async function getAssessmentsByRisk(risk_id, tenant_id) {
  const [riskRows] = await pool.query(
    `SELECT id FROM risks WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
    [risk_id, tenant_id]
  );
  if (!riskRows.length) {
    return null;
  }

  const query = `
    SELECT id, tenant_id, risk_id, assessor_id, assessment_type, likelihood_score, impact_score, risk_score, risk_level, notes, assessed_at, created_at, updated_at
    FROM risk_assessments
    WHERE risk_id = ? AND tenant_id = ? AND deleted_at IS NULL
    ORDER BY id DESC
  `;

  const [rows] = await pool.query(query, [risk_id, tenant_id]);
  return rows;
}

async function getAssessmentById(id, tenant_id) {
  let query = `
    SELECT id, tenant_id, risk_id, assessor_id, assessment_type, likelihood_score, impact_score, risk_score, risk_level, notes, assessed_at, created_at, updated_at
    FROM risk_assessments
    WHERE id = ? AND deleted_at IS NULL
  `;
  const params = [id];

  if (tenant_id) {
    query += ` AND tenant_id = ?`;
    params.push(tenant_id);
  }

  const [rows] = await pool.query(query, params);
  return rows.length ? rows[0] : null;
}

async function getLatestAssessmentsByTenant(tenant_id) {
  const query = `
    SELECT 
      r.id AS risk_id,
      r.risk_code,
      r.title,
      r.status AS risk_status,
      a.id AS assessment_id,
      a.assessment_type,
      a.likelihood_score,
      a.impact_score,
      a.risk_score,
      a.risk_level,
      a.notes,
      a.assessed_at
    FROM risks r
    INNER JOIN (
      SELECT ra1.*
      FROM risk_assessments ra1
      INNER JOIN (
        SELECT risk_id, MAX(id) AS max_id
        FROM risk_assessments
        WHERE tenant_id = ? AND deleted_at IS NULL
        GROUP BY risk_id
      ) ra2 ON ra1.id = ra2.max_id
    ) a ON r.id = a.risk_id
    WHERE r.tenant_id = ? AND r.deleted_at IS NULL
    ORDER BY a.risk_score DESC
  `;

  const [rows] = await pool.query(query, [tenant_id, tenant_id]);
  return rows;
}

module.exports = {
  createAssessment,
  getAssessmentsByRisk,
  getAssessmentById,
  getLatestAssessmentsByTenant
};
