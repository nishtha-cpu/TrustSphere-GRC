const pool = require('../config/database');

/**
 * Service to handle Audit Management database operations
 */

const VALID_AUDIT_TYPES = ['INTERNAL', 'EXTERNAL', 'REGULATORY', 'CERTIFICATION'];
const VALID_AUDIT_STATUSES = [
  'PLANNED',
  'SCHEDULED',
  'IN_PROGRESS',
  'FIELDWORK_COMPLETE',
  'REPORTING',
  'CLOSED',
  'CANCELLED'
];

/**
 * Check if a tenant exists and is active
 */
async function checkTenantExists(tenant_id) {
  const query = `SELECT id FROM tenants WHERE id = ? AND deleted_at IS NULL`;
  const [rows] = await pool.query(query, [tenant_id]);
  return rows.length > 0;
}

/**
 * Check if a user exists and belongs to the specified tenant
 */
async function checkUserInTenant(user_id, tenant_id) {
  const query = `SELECT id FROM users WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`;
  const [rows] = await pool.query(query, [user_id, tenant_id]);
  return rows.length > 0;
}

/**
 * Create a new audit engagement record
 */
async function createAudit({
  tenant_id,
  audit_code,
  title,
  description = null,
  audit_type = 'INTERNAL',
  lead_auditor_id,
  status = 'PLANNED',
  planned_start_date = null,
  planned_end_date = null,
  actual_start_date = null,
  actual_end_date = null,
  scope = null,
  objectives = null
}) {
  const query = `
    INSERT INTO audits (
      tenant_id,
      audit_code,
      title,
      description,
      audit_type,
      lead_auditor_id,
      status,
      planned_start_date,
      planned_end_date,
      actual_start_date,
      actual_end_date,
      scope,
      objectives
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.query(query, [
    tenant_id,
    audit_code,
    title,
    description,
    audit_type,
    lead_auditor_id,
    status,
    planned_start_date,
    planned_end_date,
    actual_start_date,
    actual_end_date,
    scope,
    objectives
  ]);

  return getAuditById(result.insertId, tenant_id);
}

/**
 * Get audits for a tenant with optional status and audit_type filtering
 */
async function getAuditsByTenant(tenant_id, { status = null, audit_type = null } = {}) {
  let query = `
    SELECT 
      a.id,
      a.tenant_id,
      a.audit_code,
      a.title,
      a.description,
      a.audit_type,
      a.lead_auditor_id,
      CONCAT(u.first_name, ' ', u.last_name) AS lead_auditor_name,
      u.email AS lead_auditor_email,
      a.status,
      a.planned_start_date,
      a.planned_end_date,
      a.actual_start_date,
      a.actual_end_date,
      a.scope,
      a.objectives,
      a.created_at,
      a.updated_at
    FROM audits a
    LEFT JOIN users u ON a.lead_auditor_id = u.id
    WHERE a.tenant_id = ? AND a.deleted_at IS NULL
  `;

  const params = [tenant_id];

  if (status) {
    query += ` AND a.status = ?`;
    params.push(status);
  }

  if (audit_type) {
    query += ` AND a.audit_type = ?`;
    params.push(audit_type);
  }

  query += ` ORDER BY a.id DESC`;

  const [rows] = await pool.query(query, params);
  return rows;
}

/**
 * Get a single audit by ID and tenant ID
 */
async function getAuditById(id, tenant_id = null) {
  let query = `
    SELECT 
      a.id,
      a.tenant_id,
      a.audit_code,
      a.title,
      a.description,
      a.audit_type,
      a.lead_auditor_id,
      CONCAT(u.first_name, ' ', u.last_name) AS lead_auditor_name,
      u.email AS lead_auditor_email,
      a.status,
      a.planned_start_date,
      a.planned_end_date,
      a.actual_start_date,
      a.actual_end_date,
      a.scope,
      a.objectives,
      a.created_at,
      a.updated_at
    FROM audits a
    LEFT JOIN users u ON a.lead_auditor_id = u.id
    WHERE a.id = ? AND a.deleted_at IS NULL
  `;
  const params = [id];

  if (tenant_id) {
    query += ` AND a.tenant_id = ?`;
    params.push(tenant_id);
  }

  const [rows] = await pool.query(query, params);
  return rows.length ? rows[0] : null;
}

/**
 * Update an existing audit record
 */
async function updateAudit(id, updateData, tenant_id) {
  const existing = await getAuditById(id, tenant_id);
  if (!existing) {
    return null;
  }

  const updatedTitle = updateData.title !== undefined ? updateData.title : existing.title;
  const updatedDescription = updateData.description !== undefined ? updateData.description : existing.description;
  const updatedAuditType = updateData.audit_type !== undefined ? updateData.audit_type : existing.audit_type;
  const updatedLeadAuditorId = updateData.lead_auditor_id !== undefined ? updateData.lead_auditor_id : existing.lead_auditor_id;
  const updatedStatus = updateData.status !== undefined ? updateData.status : existing.status;
  const updatedPlannedStartDate = updateData.planned_start_date !== undefined ? updateData.planned_start_date : existing.planned_start_date;
  const updatedPlannedEndDate = updateData.planned_end_date !== undefined ? updateData.planned_end_date : existing.planned_end_date;
  const updatedActualStartDate = updateData.actual_start_date !== undefined ? updateData.actual_start_date : existing.actual_start_date;
  const updatedActualEndDate = updateData.actual_end_date !== undefined ? updateData.actual_end_date : existing.actual_end_date;
  const updatedScope = updateData.scope !== undefined ? updateData.scope : existing.scope;
  const updatedObjectives = updateData.objectives !== undefined ? updateData.objectives : existing.objectives;

  const query = `
    UPDATE audits
    SET 
      title = ?,
      description = ?,
      audit_type = ?,
      lead_auditor_id = ?,
      status = ?,
      planned_start_date = ?,
      planned_end_date = ?,
      actual_start_date = ?,
      actual_end_date = ?,
      scope = ?,
      objectives = ?
    WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
  `;

  await pool.query(query, [
    updatedTitle,
    updatedDescription,
    updatedAuditType,
    updatedLeadAuditorId,
    updatedStatus,
    updatedPlannedStartDate,
    updatedPlannedEndDate,
    updatedActualStartDate,
    updatedActualEndDate,
    updatedScope,
    updatedObjectives,
    id,
    tenant_id
  ]);

  return getAuditById(id, tenant_id);
}

/**
 * Soft delete an audit record
 */
async function deleteAudit(id, tenant_id) {
  const query = `
    UPDATE audits
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
  `;
  const [result] = await pool.query(query, [id, tenant_id]);
  return result.affectedRows > 0;
}

module.exports = {
  VALID_AUDIT_TYPES,
  VALID_AUDIT_STATUSES,
  checkTenantExists,
  checkUserInTenant,
  createAudit,
  getAuditsByTenant,
  getAuditById,
  updateAudit,
  deleteAudit
};
