const pool = require('../config/database');

/**
 * Service to handle CAPA / Corrective Actions database operations
 */

const VALID_CAPA_STATUSES = [
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'VERIFIED',
  'CLOSED'
];

/**
 * Check if finding exists for tenant and is active
 */
async function checkFindingForTenant(finding_id, tenant_id) {
  const query = `SELECT id FROM audit_findings WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`;
  const [rows] = await pool.query(query, [finding_id, tenant_id]);
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
 * Create a new CAPA record
 */
async function createCapa({
  tenant_id,
  finding_id,
  capa_code,
  action_plan,
  owner_id,
  due_date,
  completion_date = null,
  status = 'ASSIGNED',
  verification_notes = null,
  verified_by = null,
  verified_at = null
}) {
  const query = `
    INSERT INTO corrective_actions (
      tenant_id,
      finding_id,
      capa_code,
      action_plan,
      owner_id,
      due_date,
      completion_date,
      status,
      verification_notes,
      verified_by,
      verified_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.query(query, [
    tenant_id,
    finding_id,
    capa_code,
    action_plan,
    owner_id,
    due_date,
    completion_date || null,
    status,
    verification_notes || null,
    verified_by || null,
    verified_at || null
  ]);

  return getCapaById(result.insertId, tenant_id);
}

/**
 * Get all active CAPAs for a finding
 */
async function getCapasByFinding(finding_id, tenant_id) {
  const query = `
    SELECT 
      c.id,
      c.tenant_id,
      c.finding_id,
      f.finding_code,
      f.title AS finding_title,
      c.capa_code,
      c.action_plan,
      c.owner_id,
      CONCAT(u_owner.first_name, ' ', u_owner.last_name) AS owner_name,
      u_owner.email AS owner_email,
      c.due_date,
      c.completion_date,
      c.status,
      c.verification_notes,
      c.verified_by,
      CONCAT(u_verifier.first_name, ' ', u_verifier.last_name) AS verifier_name,
      u_verifier.email AS verifier_email,
      c.verified_at,
      c.created_at,
      c.updated_at
    FROM corrective_actions c
    LEFT JOIN audit_findings f ON c.finding_id = f.id AND f.deleted_at IS NULL
    LEFT JOIN users u_owner ON c.owner_id = u_owner.id AND u_owner.deleted_at IS NULL
    LEFT JOIN users u_verifier ON c.verified_by = u_verifier.id AND u_verifier.deleted_at IS NULL
    WHERE c.finding_id = ? AND c.tenant_id = ? AND c.deleted_at IS NULL
    ORDER BY c.id DESC
  `;

  const [rows] = await pool.query(query, [finding_id, tenant_id]);
  return rows;
}

/**
 * Get a single CAPA by ID
 */
async function getCapaById(id, tenant_id = null) {
  let query = `
    SELECT 
      c.id,
      c.tenant_id,
      c.finding_id,
      f.finding_code,
      f.title AS finding_title,
      c.capa_code,
      c.action_plan,
      c.owner_id,
      CONCAT(u_owner.first_name, ' ', u_owner.last_name) AS owner_name,
      u_owner.email AS owner_email,
      c.due_date,
      c.completion_date,
      c.status,
      c.verification_notes,
      c.verified_by,
      CONCAT(u_verifier.first_name, ' ', u_verifier.last_name) AS verifier_name,
      u_verifier.email AS verifier_email,
      c.verified_at,
      c.created_at,
      c.updated_at
    FROM corrective_actions c
    LEFT JOIN audit_findings f ON c.finding_id = f.id AND f.deleted_at IS NULL
    LEFT JOIN users u_owner ON c.owner_id = u_owner.id AND u_owner.deleted_at IS NULL
    LEFT JOIN users u_verifier ON c.verified_by = u_verifier.id AND u_verifier.deleted_at IS NULL
    WHERE c.id = ? AND c.deleted_at IS NULL
  `;

  const params = [id];

  if (tenant_id) {
    query += ` AND c.tenant_id = ?`;
    params.push(tenant_id);
  }

  const [rows] = await pool.query(query, params);
  return rows.length ? rows[0] : null;
}

/**
 * Update an existing CAPA record
 */
async function updateCapa(id, updateData, tenant_id) {
  const existing = await getCapaById(id, tenant_id);
  if (!existing) {
    return null;
  }

  const updatedActionPlan = updateData.action_plan !== undefined ? updateData.action_plan : existing.action_plan;
  const updatedOwnerId = updateData.owner_id !== undefined ? updateData.owner_id : existing.owner_id;
  const updatedDueDate = updateData.due_date !== undefined ? updateData.due_date : existing.due_date;
  const updatedCompletionDate = updateData.completion_date !== undefined ? updateData.completion_date : existing.completion_date;
  const updatedStatus = updateData.status !== undefined ? updateData.status : existing.status;
  const updatedVerificationNotes = updateData.verification_notes !== undefined ? updateData.verification_notes : existing.verification_notes;
  const updatedVerifiedBy = updateData.verified_by !== undefined ? updateData.verified_by : existing.verified_by;
  const updatedVerifiedAt = updateData.verified_at !== undefined ? updateData.verified_at : existing.verified_at;

  const query = `
    UPDATE corrective_actions
    SET 
      action_plan = ?,
      owner_id = ?,
      due_date = ?,
      completion_date = ?,
      status = ?,
      verification_notes = ?,
      verified_by = ?,
      verified_at = ?
    WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
  `;

  await pool.query(query, [
    updatedActionPlan,
    updatedOwnerId,
    updatedDueDate,
    updatedCompletionDate || null,
    updatedStatus,
    updatedVerificationNotes || null,
    updatedVerifiedBy || null,
    updatedVerifiedAt || null,
    id,
    tenant_id
  ]);

  return getCapaById(id, tenant_id);
}

/**
 * Soft delete a CAPA record
 */
async function deleteCapa(id, tenant_id) {
  const query = `
    UPDATE corrective_actions
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
  `;
  const [result] = await pool.query(query, [id, tenant_id]);
  return result.affectedRows > 0;
}

module.exports = {
  VALID_CAPA_STATUSES,
  checkFindingForTenant,
  checkUserForTenant,
  createCapa,
  getCapasByFinding,
  getCapaById,
  updateCapa,
  deleteCapa
};
