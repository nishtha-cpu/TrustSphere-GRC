const pool = require('../config/database');

/**
 * Service to handle Policy Management database operations
 */

const VALID_POLICY_TYPES = [
  'INFORMATION_SECURITY',
  'PRIVACY',
  'ACCESS_CONTROL',
  'INCIDENT_RESPONSE',
  'BUSINESS_CONTINUITY',
  'DATA_RETENTION',
  'ACCEPTABLE_USE',
  'THIRD_PARTY',
  'OTHER'
];

const VALID_POLICY_STATUSES = [
  'DRAFT',
  'UNDER_REVIEW',
  'APPROVED',
  'PUBLISHED',
  'ARCHIVED'
];

/**
 * Check if a tenant exists and is active
 */
async function checkTenantExists(tenant_id, connection = pool) {
  const query = `SELECT id FROM tenants WHERE id = ? AND deleted_at IS NULL`;
  const [rows] = await connection.query(query, [tenant_id]);
  return rows.length > 0;
}

/**
 * Check if a user exists and belongs to the specified tenant
 */
async function checkUserInTenant(user_id, tenant_id, connection = pool) {
  const query = `SELECT id FROM users WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`;
  const [rows] = await connection.query(query, [user_id, tenant_id]);
  return rows.length > 0;
}

/**
 * Create a new policy record
 */
async function createPolicy({
  tenant_id,
  policy_code,
  title,
  description = null,
  policy_type = 'INFORMATION_SECURITY',
  owner_id,
  status = 'DRAFT',
  review_date = null,
  effective_date = null,
  expiry_date = null
}) {
  const query = `
    INSERT INTO policies (
      tenant_id,
      policy_code,
      title,
      description,
      policy_type,
      owner_id,
      status,
      review_date,
      effective_date,
      expiry_date
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.query(query, [
    tenant_id,
    policy_code,
    title,
    description,
    policy_type,
    owner_id,
    status,
    review_date,
    effective_date,
    expiry_date
  ]);

  return getPolicyById(result.insertId, tenant_id);
}

/**
 * Get active policies for a tenant with optional filtering & search
 */
async function getPolicies({ tenant_id, status, policy_type, owner_id, search }) {
  let query = `
    SELECT 
      p.id,
      p.tenant_id,
      p.policy_code,
      p.title,
      p.description,
      p.policy_type,
      p.owner_id,
      CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
      u.email AS owner_email,
      p.status,
      p.current_version_id,
      v.version_label AS current_version_label,
      p.review_date,
      p.effective_date,
      p.expiry_date,
      p.created_at,
      p.updated_at
    FROM policies p
    JOIN users u ON p.owner_id = u.id AND u.deleted_at IS NULL
    LEFT JOIN policy_versions v ON p.current_version_id = v.id AND v.deleted_at IS NULL
    WHERE p.tenant_id = ? AND p.deleted_at IS NULL
  `;

  const queryParams = [tenant_id];

  if (status) {
    query += ` AND p.status = ?`;
    queryParams.push(status);
  }

  if (policy_type) {
    query += ` AND p.policy_type = ?`;
    queryParams.push(policy_type);
  }

  if (owner_id) {
    query += ` AND p.owner_id = ?`;
    queryParams.push(owner_id);
  }

  if (search && search.trim() !== '') {
    query += ` AND (p.policy_code LIKE ? OR p.title LIKE ?)`;
    const term = `%${search.trim()}%`;
    queryParams.push(term, term);
  }

  query += ` ORDER BY p.updated_at DESC`;

  const [rows] = await pool.query(query, queryParams);
  return rows;
}

/**
 * Get single policy metadata by ID (with owner & current version details)
 */
async function getPolicyById(id, tenant_id) {
  const query = `
    SELECT 
      p.id,
      p.tenant_id,
      p.policy_code,
      p.title,
      p.description,
      p.policy_type,
      p.owner_id,
      CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
      u.email AS owner_email,
      p.status,
      p.current_version_id,
      v.version_number AS current_version_number,
      v.version_label AS current_version_label,
      v.content AS current_version_content,
      v.change_summary AS current_version_change_summary,
      v.approved_at AS current_version_approved_at,
      v.published_at AS current_version_published_at,
      CONCAT(c_u.first_name, ' ', c_u.last_name) AS current_version_created_by_name,
      p.review_date,
      p.effective_date,
      p.expiry_date,
      p.created_at,
      p.updated_at
    FROM policies p
    JOIN users u ON p.owner_id = u.id AND u.deleted_at IS NULL
    LEFT JOIN policy_versions v ON p.current_version_id = v.id AND v.deleted_at IS NULL
    LEFT JOIN users c_u ON v.created_by = c_u.id
    WHERE p.id = ? AND p.tenant_id = ? AND p.deleted_at IS NULL
  `;

  const [rows] = await pool.query(query, [id, tenant_id]);
  return rows.length ? rows[0] : null;
}

/**
 * Update policy metadata
 */
async function updatePolicy(id, updateData, tenant_id) {
  const existing = await getPolicyById(id, tenant_id);
  if (!existing) {
    const err = new Error('Policy not found or deleted');
    err.status = 404;
    throw err;
  }

  if (existing.status === 'ARCHIVED' && updateData.status !== 'ARCHIVED') {
    const err = new Error('Cannot update an archived policy');
    err.status = 400;
    throw err;
  }

  // Check new owner if provided
  if (updateData.owner_id) {
    const ownerValid = await checkUserInTenant(updateData.owner_id, tenant_id);
    if (!ownerValid) {
      const err = new Error('Invalid owner_id: user does not exist or does not belong to specified tenant');
      err.status = 400;
      throw err;
    }
  }

  // Handle PUBLISHED status transition rules
  const targetStatus = updateData.status !== undefined ? updateData.status : existing.status;
  const targetCurrentVersionId = updateData.current_version_id !== undefined
    ? updateData.current_version_id
    : existing.current_version_id;

  if (targetStatus === 'PUBLISHED') {
    if (!targetCurrentVersionId) {
      const err = new Error('Cannot publish policy without a current version');
      err.status = 400;
      throw err;
    }

    // Verify current version exists, belongs to same policy/tenant, and is approved
    const [vRows] = await pool.query(
      `SELECT id, policy_id, tenant_id, approved_at, approved_by 
       FROM policy_versions 
       WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [targetCurrentVersionId, tenant_id]
    );

    if (vRows.length === 0 || Number(vRows[0].policy_id) !== Number(id)) {
      const err = new Error('Invalid current_version_id: version does not exist or belong to this policy');
      err.status = 400;
      throw err;
    }

    if (!vRows[0].approved_at && !vRows[0].approved_by) {
      const err = new Error('Cannot publish policy: referenced current version has not been approved');
      err.status = 400;
      throw err;
    }
  }

  const query = `
    UPDATE policies
    SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      policy_type = COALESCE(?, policy_type),
      owner_id = COALESCE(?, owner_id),
      status = COALESCE(?, status),
      current_version_id = COALESCE(?, current_version_id),
      review_date = COALESCE(?, review_date),
      effective_date = COALESCE(?, effective_date),
      expiry_date = COALESCE(?, expiry_date)
    WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
  `;

  await pool.query(query, [
    updateData.title !== undefined ? updateData.title : null,
    updateData.description !== undefined ? updateData.description : null,
    updateData.policy_type !== undefined ? updateData.policy_type : null,
    updateData.owner_id !== undefined ? updateData.owner_id : null,
    updateData.status !== undefined ? updateData.status : null,
    updateData.current_version_id !== undefined ? updateData.current_version_id : null,
    updateData.review_date !== undefined ? updateData.review_date : null,
    updateData.effective_date !== undefined ? updateData.effective_date : null,
    updateData.expiry_date !== undefined ? updateData.expiry_date : null,
    id,
    tenant_id
  ]);

  return getPolicyById(id, tenant_id);
}

/**
 * Soft delete a policy record (without soft-deleting versions physically)
 */
async function deletePolicy(id, tenant_id) {
  const query = `
    UPDATE policies
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
  `;
  const [result] = await pool.query(query, [id, tenant_id]);
  return result.affectedRows > 0;
}

/**
 * Create a new policy version (append-only history)
 */
async function createPolicyVersion({
  tenant_id,
  policy_id,
  version_number,
  version_label = '1.0',
  content,
  change_summary = null,
  created_by
}) {
  // 1. Verify parent policy
  const policy = await getPolicyById(policy_id, tenant_id);
  if (!policy) {
    const err = new Error('Parent policy not found or deleted');
    err.status = 404;
    throw err;
  }

  // 2. Verify creator user
  const userValid = await checkUserInTenant(created_by, tenant_id);
  if (!userValid) {
    const err = new Error('Invalid created_by: user does not exist or does not belong to specified tenant');
    err.status = 400;
    throw err;
  }

  // 3. Validate version_number
  const numVer = Number(version_number);
  if (isNaN(numVer) || numVer <= 0 || !Number.isInteger(numVer)) {
    const err = new Error('Invalid version_number: must be a positive integer');
    err.status = 400;
    throw err;
  }

  // 4. Validate duplicate version number for this policy & tenant
  const [dupRows] = await pool.query(
    `SELECT id FROM policy_versions WHERE tenant_id = ? AND policy_id = ? AND version_number = ? AND deleted_at IS NULL`,
    [tenant_id, policy_id, numVer]
  );
  if (dupRows.length > 0) {
    const err = new Error(`Version number ${numVer} already exists for this policy`);
    err.status = 409;
    throw err;
  }

  // 5. Insert version
  const query = `
    INSERT INTO policy_versions (
      tenant_id,
      policy_id,
      version_number,
      version_label,
      content,
      change_summary,
      created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.query(query, [
    tenant_id,
    policy_id,
    numVer,
    version_label,
    content,
    change_summary,
    created_by
  ]);

  return getPolicyVersionById(result.insertId, tenant_id);
}

/**
 * Get all active versions for a policy
 */
async function getPolicyVersions(policy_id, tenant_id) {
  const policy = await getPolicyById(policy_id, tenant_id);
  if (!policy) {
    const err = new Error('Parent policy not found or deleted');
    err.status = 404;
    throw err;
  }

  const query = `
    SELECT 
      v.id,
      v.tenant_id,
      v.policy_id,
      v.version_number,
      v.version_label,
      v.content,
      v.change_summary,
      v.created_by,
      CONCAT(c_u.first_name, ' ', c_u.last_name) AS created_by_name,
      c_u.email AS created_by_email,
      v.reviewed_by,
      CONCAT(r_u.first_name, ' ', r_u.last_name) AS reviewed_by_name,
      v.approved_by,
      CONCAT(a_u.first_name, ' ', a_u.last_name) AS approved_by_name,
      v.approved_at,
      v.published_at,
      v.created_at,
      v.updated_at
    FROM policy_versions v
    JOIN users c_u ON v.created_by = c_u.id AND c_u.deleted_at IS NULL
    LEFT JOIN users r_u ON v.reviewed_by = r_u.id AND r_u.deleted_at IS NULL
    LEFT JOIN users a_u ON v.approved_by = a_u.id AND a_u.deleted_at IS NULL
    WHERE v.policy_id = ? AND v.tenant_id = ? AND v.deleted_at IS NULL
    ORDER BY v.version_number DESC
  `;

  const [rows] = await pool.query(query, [policy_id, tenant_id]);
  return rows;
}

/**
 * Get single policy version by ID
 */
async function getPolicyVersionById(id, tenant_id) {
  const query = `
    SELECT 
      v.id,
      v.tenant_id,
      v.policy_id,
      p.policy_code,
      p.title AS policy_title,
      p.status AS policy_status,
      v.version_number,
      v.version_label,
      v.content,
      v.change_summary,
      v.created_by,
      CONCAT(c_u.first_name, ' ', c_u.last_name) AS created_by_name,
      c_u.email AS created_by_email,
      v.reviewed_by,
      CONCAT(r_u.first_name, ' ', r_u.last_name) AS reviewed_by_name,
      v.approved_by,
      CONCAT(a_u.first_name, ' ', a_u.last_name) AS approved_by_name,
      v.approved_at,
      v.published_at,
      v.created_at,
      v.updated_at
    FROM policy_versions v
    JOIN policies p ON v.policy_id = p.id AND p.deleted_at IS NULL
    JOIN users c_u ON v.created_by = c_u.id AND c_u.deleted_at IS NULL
    LEFT JOIN users r_u ON v.reviewed_by = r_u.id AND r_u.deleted_at IS NULL
    LEFT JOIN users a_u ON v.approved_by = a_u.id AND a_u.deleted_at IS NULL
    WHERE v.id = ? AND v.tenant_id = ? AND v.deleted_at IS NULL
  `;

  const [rows] = await pool.query(query, [id, tenant_id]);
  return rows.length ? rows[0] : null;
}

/**
 * Helper to review a policy version
 */
async function reviewPolicyVersion(id, reviewer_id, tenant_id) {
  const version = await getPolicyVersionById(id, tenant_id);
  if (!version) {
    const err = new Error('Policy version not found or deleted');
    err.status = 404;
    throw err;
  }

  const userValid = await checkUserInTenant(reviewer_id, tenant_id);
  if (!userValid) {
    const err = new Error('Invalid reviewer_id: user does not exist or does not belong to specified tenant');
    err.status = 400;
    throw err;
  }

  await pool.query(
    `UPDATE policy_versions SET reviewed_by = ? WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
    [reviewer_id, id, tenant_id]
  );

  return getPolicyVersionById(id, tenant_id);
}

/**
 * Helper to approve a policy version (and optionally set as policy current_version_id)
 */
async function approvePolicyVersion(id, approver_id, tenant_id, set_as_current = true) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const version = await getPolicyVersionById(id, tenant_id);
    if (!version) {
      const err = new Error('Policy version not found or deleted');
      err.status = 404;
      throw err;
    }

    const userValid = await checkUserInTenant(approver_id, tenant_id, connection);
    if (!userValid) {
      const err = new Error('Invalid approver_id: user does not exist or does not belong to specified tenant');
      err.status = 400;
      throw err;
    }

    // Approve version
    await connection.query(
      `UPDATE policy_versions SET approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [approver_id, id, tenant_id]
    );

    if (set_as_current) {
      await connection.query(
        `UPDATE policies SET current_version_id = ?, status = 'APPROVED' WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
        [id, version.policy_id, tenant_id]
      );
    }

    await connection.commit();
    return getPolicyVersionById(id, tenant_id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  VALID_POLICY_TYPES,
  VALID_POLICY_STATUSES,
  checkTenantExists,
  checkUserInTenant,
  createPolicy,
  getPolicies,
  getPolicyById,
  updatePolicy,
  deletePolicy,
  createPolicyVersion,
  getPolicyVersions,
  getPolicyVersionById,
  reviewPolicyVersion,
  approvePolicyVersion
};
