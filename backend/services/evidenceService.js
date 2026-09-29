const pool = require('../config/database');

/**
 * Service to handle Audit Evidence metadata database operations
 */

/**
 * Check if audit exists for tenant and is active
 */
async function checkAuditForTenant(audit_id, tenant_id) {
  const query = `SELECT id FROM audits WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`;
  const [rows] = await pool.query(query, [audit_id, tenant_id]);
  return rows.length > 0;
}

/**
 * Check if finding exists for tenant and is active
 */
async function checkFindingForTenant(finding_id, tenant_id) {
  const query = `SELECT id FROM audit_findings WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`;
  const [rows] = await pool.query(query, [finding_id, tenant_id]);
  return rows.length > 0;
}

/**
 * Check if CAPA exists for tenant and is active
 */
async function checkCapaForTenant(capa_id, tenant_id) {
  const query = `SELECT id FROM corrective_actions WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`;
  const [rows] = await pool.query(query, [capa_id, tenant_id]);
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
 * Create new evidence metadata record
 */
async function createEvidence({
  tenant_id,
  audit_id = null,
  finding_id = null,
  capa_id = null,
  file_name,
  file_key,
  file_size_bytes,
  mime_type,
  uploaded_by
}) {
  const query = `
    INSERT INTO audit_evidence (
      tenant_id,
      audit_id,
      finding_id,
      capa_id,
      file_name,
      file_key,
      file_size_bytes,
      mime_type,
      uploaded_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.query(query, [
    tenant_id,
    audit_id || null,
    finding_id || null,
    capa_id || null,
    file_name,
    file_key,
    file_size_bytes,
    mime_type,
    uploaded_by
  ]);

  return getEvidenceById(result.insertId, tenant_id);
}

/**
 * Get evidence list for an audit
 */
async function getEvidenceByAudit(audit_id, tenant_id) {
  const query = `
    SELECT 
      e.id,
      e.tenant_id,
      e.audit_id,
      a.audit_code,
      a.title AS audit_title,
      e.file_name,
      e.file_key,
      e.file_size_bytes,
      e.mime_type,
      e.uploaded_by,
      CONCAT(u.first_name, ' ', u.last_name) AS uploaded_by_name,
      u.email AS uploaded_by_email,
      e.created_at,
      e.updated_at
    FROM audit_evidence e
    LEFT JOIN audits a ON e.audit_id = a.id AND a.deleted_at IS NULL
    LEFT JOIN users u ON e.uploaded_by = u.id AND u.deleted_at IS NULL
    WHERE e.audit_id = ? AND e.tenant_id = ? AND e.deleted_at IS NULL
    ORDER BY e.id DESC
  `;

  const [rows] = await pool.query(query, [audit_id, tenant_id]);
  return rows;
}

/**
 * Get evidence list for a finding
 */
async function getEvidenceByFinding(finding_id, tenant_id) {
  const query = `
    SELECT 
      e.id,
      e.tenant_id,
      e.finding_id,
      f.finding_code,
      f.title AS finding_title,
      e.file_name,
      e.file_key,
      e.file_size_bytes,
      e.mime_type,
      e.uploaded_by,
      CONCAT(u.first_name, ' ', u.last_name) AS uploaded_by_name,
      u.email AS uploaded_by_email,
      e.created_at,
      e.updated_at
    FROM audit_evidence e
    LEFT JOIN audit_findings f ON e.finding_id = f.id AND f.deleted_at IS NULL
    LEFT JOIN users u ON e.uploaded_by = u.id AND u.deleted_at IS NULL
    WHERE e.finding_id = ? AND e.tenant_id = ? AND e.deleted_at IS NULL
    ORDER BY e.id DESC
  `;

  const [rows] = await pool.query(query, [finding_id, tenant_id]);
  return rows;
}

/**
 * Get evidence list for a CAPA
 */
async function getEvidenceByCapa(capa_id, tenant_id) {
  const query = `
    SELECT 
      e.id,
      e.tenant_id,
      e.capa_id,
      c.capa_code,
      e.file_name,
      e.file_key,
      e.file_size_bytes,
      e.mime_type,
      e.uploaded_by,
      CONCAT(u.first_name, ' ', u.last_name) AS uploaded_by_name,
      u.email AS uploaded_by_email,
      e.created_at,
      e.updated_at
    FROM audit_evidence e
    LEFT JOIN corrective_actions c ON e.capa_id = c.id AND c.deleted_at IS NULL
    LEFT JOIN users u ON e.uploaded_by = u.id AND u.deleted_at IS NULL
    WHERE e.capa_id = ? AND e.tenant_id = ? AND e.deleted_at IS NULL
    ORDER BY e.id DESC
  `;

  const [rows] = await pool.query(query, [capa_id, tenant_id]);
  return rows;
}

/**
 * Get single evidence metadata by ID
 */
async function getEvidenceById(id, tenant_id = null) {
  let query = `
    SELECT 
      e.id,
      e.tenant_id,
      e.audit_id,
      a.audit_code,
      a.title AS audit_title,
      e.finding_id,
      f.finding_code,
      f.title AS finding_title,
      e.capa_id,
      c.capa_code,
      e.file_name,
      e.file_key,
      e.file_size_bytes,
      e.mime_type,
      e.uploaded_by,
      CONCAT(u.first_name, ' ', u.last_name) AS uploaded_by_name,
      u.email AS uploaded_by_email,
      e.created_at,
      e.updated_at
    FROM audit_evidence e
    LEFT JOIN audits a ON e.audit_id = a.id AND a.deleted_at IS NULL
    LEFT JOIN audit_findings f ON e.finding_id = f.id AND f.deleted_at IS NULL
    LEFT JOIN corrective_actions c ON e.capa_id = c.id AND c.deleted_at IS NULL
    LEFT JOIN users u ON e.uploaded_by = u.id AND u.deleted_at IS NULL
    WHERE e.id = ? AND e.deleted_at IS NULL
  `;

  const params = [id];

  if (tenant_id) {
    query += ` AND e.tenant_id = ?`;
    params.push(tenant_id);
  }

  const [rows] = await pool.query(query, params);
  return rows.length ? rows[0] : null;
}

/**
 * Soft delete an evidence metadata record
 */
async function deleteEvidence(id, tenant_id) {
  const query = `
    UPDATE audit_evidence
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
  `;
  const [result] = await pool.query(query, [id, tenant_id]);
  return result.affectedRows > 0;
}

module.exports = {
  checkAuditForTenant,
  checkFindingForTenant,
  checkCapaForTenant,
  checkUserForTenant,
  createEvidence,
  getEvidenceByAudit,
  getEvidenceByFinding,
  getEvidenceByCapa,
  getEvidenceById,
  deleteEvidence
};
