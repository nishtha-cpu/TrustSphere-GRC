const pool = require('../config/database');

/**
 * Service for Audit Findings database operations
 */

const VALID_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const VALID_STATUSES = ['DRAFT', 'OPEN', 'IN_REMEDIATION', 'UNDER_REVIEW', 'CLOSED'];

/**
 * Check if audit exists for tenant and is active
 */
async function checkAuditForTenant(audit_id, tenant_id) {
  const query = `SELECT id FROM audits WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`;
  const [rows] = await pool.query(query, [audit_id, tenant_id]);
  return rows.length > 0;
}

/**
 * Check if user exists for tenant and is active
 */
async function checkUserForTenant(user_id, tenant_id) {
  const query = `SELECT id FROM users WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`;
  const [rows] = await pool.query(query, [user_id, tenant_id]);
  return rows.length > 0;
}

/**
 * Check if risk exists for tenant and is active
 */
async function checkRiskForTenant(risk_id, tenant_id) {
  const query = `SELECT id FROM risks WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`;
  const [rows] = await pool.query(query, [risk_id, tenant_id]);
  return rows.length > 0;
}

/**
 * Create a new audit finding
 */
async function createFinding({
  tenant_id,
  audit_id,
  finding_code,
  title,
  description,
  severity = 'MEDIUM',
  status = 'DRAFT',
  risk_id = null,
  identified_by,
  identified_date
}) {
  const query = `
    INSERT INTO audit_findings (
      tenant_id,
      audit_id,
      finding_code,
      title,
      description,
      severity,
      status,
      risk_id,
      identified_by,
      identified_date
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.query(query, [
    tenant_id,
    audit_id,
    finding_code,
    title,
    description,
    severity,
    status,
    risk_id || null,
    identified_by,
    identified_date
  ]);

  return getFindingById(result.insertId, tenant_id);
}

/**
 * Get findings by audit ID with optional severity and status filters
 */
async function getFindingsByAudit(audit_id, tenant_id, { severity = null, status = null } = {}) {
  let query = `
    SELECT 
      af.id,
      af.tenant_id,
      af.audit_id,
      af.finding_code,
      af.title,
      af.description,
      af.severity,
      af.status,
      af.risk_id,
      r.risk_code,
      r.title AS risk_title,
      af.identified_by,
      CONCAT(u.first_name, ' ', u.last_name) AS identified_by_name,
      u.email AS identified_by_email,
      af.identified_date,
      af.created_at,
      af.updated_at
    FROM audit_findings af
    LEFT JOIN risks r ON af.risk_id = r.id AND r.deleted_at IS NULL
    LEFT JOIN users u ON af.identified_by = u.id AND u.deleted_at IS NULL
    WHERE af.audit_id = ? AND af.tenant_id = ? AND af.deleted_at IS NULL
  `;

  const params = [audit_id, tenant_id];

  if (severity) {
    query += ` AND af.severity = ?`;
    params.push(severity);
  }

  if (status) {
    query += ` AND af.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY af.id DESC`;

  const [rows] = await pool.query(query, params);
  return rows;
}

/**
 * Get a single finding by ID and tenant_id
 */
async function getFindingById(id, tenant_id = null) {
  let query = `
    SELECT 
      af.id,
      af.tenant_id,
      af.audit_id,
      af.finding_code,
      af.title,
      af.description,
      af.severity,
      af.status,
      af.risk_id,
      r.risk_code,
      r.title AS risk_title,
      af.identified_by,
      CONCAT(u.first_name, ' ', u.last_name) AS identified_by_name,
      u.email AS identified_by_email,
      af.identified_date,
      af.created_at,
      af.updated_at
    FROM audit_findings af
    LEFT JOIN risks r ON af.risk_id = r.id AND r.deleted_at IS NULL
    LEFT JOIN users u ON af.identified_by = u.id AND u.deleted_at IS NULL
    WHERE af.id = ? AND af.deleted_at IS NULL
  `;

  const params = [id];

  if (tenant_id) {
    query += ` AND af.tenant_id = ?`;
    params.push(tenant_id);
  }

  const [rows] = await pool.query(query, params);
  return rows.length ? rows[0] : null;
}

/**
 * Update an existing finding
 */
async function updateFinding(id, updateData, tenant_id) {
  const existing = await getFindingById(id, tenant_id);
  if (!existing) {
    return null;
  }

  const updatedTitle = updateData.title !== undefined ? updateData.title : existing.title;
  const updatedDescription = updateData.description !== undefined ? updateData.description : existing.description;
  const updatedSeverity = updateData.severity !== undefined ? updateData.severity : existing.severity;
  const updatedStatus = updateData.status !== undefined ? updateData.status : existing.status;
  const updatedRiskId = updateData.risk_id !== undefined ? updateData.risk_id : existing.risk_id;
  const updatedIdentifiedDate = updateData.identified_date !== undefined ? updateData.identified_date : existing.identified_date;

  const query = `
    UPDATE audit_findings
    SET 
      title = ?,
      description = ?,
      severity = ?,
      status = ?,
      risk_id = ?,
      identified_date = ?
    WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
  `;

  await pool.query(query, [
    updatedTitle,
    updatedDescription,
    updatedSeverity,
    updatedStatus,
    updatedRiskId || null,
    updatedIdentifiedDate,
    id,
    tenant_id
  ]);

  return getFindingById(id, tenant_id);
}

/**
 * Soft delete a finding
 */
async function deleteFinding(id, tenant_id) {
  const query = `
    UPDATE audit_findings
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
  `;
  const [result] = await pool.query(query, [id, tenant_id]);
  return result.affectedRows > 0;
}

module.exports = {
  VALID_SEVERITIES,
  VALID_STATUSES,
  checkAuditForTenant,
  checkUserForTenant,
  checkRiskForTenant,
  createFinding,
  getFindingsByAudit,
  getFindingById,
  updateFinding,
  deleteFinding
};
