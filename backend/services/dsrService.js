const pool = require('../config/database');

/**
 * ==========================================
 * DATA SUBJECT REQUEST (DSR) & DPRM SERVICE
 * ==========================================
 */

/**
 * Generate unique DSR request reference: DSR-YYYYMMDD-XXXX
 */
function generateRequestReference() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `DSR-${dateStr}-${randomSuffix}`;
}

const VALID_REQUEST_TYPES = [
  'ACCESS',
  'CORRECTION',
  'RECTIFICATION',
  'ERASURE',
  'CONSENT_WITHDRAWAL',
  'GRIEVANCE',
  'RESTRICTION',
  'PORTABILITY',
  'OBJECTION'
];

const VALID_STATUSES = [
  'SUBMITTED',
  'RECEIVED',
  'IDENTITY_VERIFICATION',
  'IN_REVIEW',
  'CASE_ASSIGNED',
  'IN_PROGRESS',
  'DATA_COLLECTION',
  'APPROVAL_PENDING',
  'RESPONSE_GENERATION',
  'CLOSED',
  'COMPLETED',
  'REJECTED',
  'CANCELLED'
];

/**
 * Helper to insert an entry into immutable dsr_history audit log
 */
async function recordDSRHistory(connection, tenantId, dsrId, previousStatus, newStatus, action, performedBy, notes = null, metadata = null) {
  const query = `
    INSERT INTO dsr_history 
    (tenant_id, dsr_id, previous_status, new_status, action, performed_by, performed_at, notes, metadata)
    VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)
  `;
  await connection.query(query, [
    tenantId,
    dsrId,
    previousStatus || 'NONE',
    newStatus,
    action,
    performedBy || null,
    notes || null,
    metadata ? JSON.stringify(metadata) : null
  ]);
}

/**
 * Create a new Data Subject Request / DPRM ticket
 */
async function createDSR(tenantId, data, actingUserId = null) {
  const {
    data_subject_identifier,
    user_id,
    request_type = 'ACCESS',
    description,
    due_at,
    assigned_to,
    resolution_notes
  } = data;

  if (!data_subject_identifier || !data_subject_identifier.trim()) {
    const err = new Error('data_subject_identifier is required');
    err.status = 400;
    throw err;
  }

  if (!request_type || !VALID_REQUEST_TYPES.includes(request_type)) {
    const err = new Error(`Invalid request_type. Must be one of: ${VALID_REQUEST_TYPES.join(', ')}`);
    err.status = 400;
    throw err;
  }

  // Validate user_id if supplied
  if (user_id) {
    const [uRows] = await pool.query(
      `SELECT id FROM users WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [user_id, tenantId]
    );
    if (uRows.length === 0) {
      const err = new Error('Referenced user_id not found in tenant');
      err.status = 400;
      throw err;
    }
  }

  // Validate assigned_to if supplied
  if (assigned_to) {
    const [aRows] = await pool.query(
      `SELECT id FROM users WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [assigned_to, tenantId]
    );
    if (aRows.length === 0) {
      const err = new Error('Assigned user not found in tenant');
      err.status = 400;
      throw err;
    }
  }

  const reference = generateRequestReference();
  const defaultDue = due_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  const initialStatus = 'SUBMITTED';

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO data_subject_requests 
       (tenant_id, request_reference, data_subject_identifier, user_id, request_type, status, description, received_at, due_at, assigned_to, resolution_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [
        tenantId,
        reference,
        data_subject_identifier.trim().toLowerCase(),
        user_id || null,
        request_type,
        initialStatus,
        description || null,
        defaultDue,
        assigned_to || null,
        resolution_notes || null
      ]
    );

    const dsrId = result.insertId;

    // Record initial history
    await recordDSRHistory(
      connection,
      tenantId,
      dsrId,
      'NONE',
      initialStatus,
      'REQUEST_SUBMITTED',
      actingUserId,
      `Request logged for right ${request_type}`
    );

    await connection.commit();
    return await getDSRById(tenantId, dsrId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Get DSR by ID with full workflow metadata
 */
async function getDSRById(tenantId, dsrId) {
  const [rows] = await pool.query(
    `SELECT d.id, d.tenant_id, d.request_reference, d.data_subject_identifier, d.user_id,
            d.request_type, d.status, d.description, d.received_at, d.due_at, d.completed_at,
            d.assigned_to, d.resolution_notes,
            d.verification_status, d.verified_by, d.verified_at, d.verification_notes,
            d.data_collection_notes, d.data_collected_at,
            d.approval_status, d.approved_by, d.approved_at, d.approval_notes,
            d.response_summary, d.response_file_name,
            d.created_at, d.updated_at,
            CONCAT(u.first_name, ' ', u.last_name) AS user_name,
            CONCAT(a.first_name, ' ', a.last_name) AS assigned_to_name,
            CONCAT(v.first_name, ' ', v.last_name) AS verified_by_name,
            CONCAT(ap.first_name, ' ', ap.last_name) AS approved_by_name
     FROM data_subject_requests d
     LEFT JOIN users u ON d.user_id = u.id
     LEFT JOIN users a ON d.assigned_to = a.id
     LEFT JOIN users v ON d.verified_by = v.id
     LEFT JOIN users ap ON d.approved_by = ap.id
     WHERE d.id = ? AND d.tenant_id = ? AND d.deleted_at IS NULL`,
    [dsrId, tenantId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * List DSRs with filtering & search
 */
async function getDSRs(tenantId, filters = {}) {
  let query = `
    SELECT d.id, d.tenant_id, d.request_reference, d.data_subject_identifier, d.user_id,
            d.request_type, d.status, d.description, d.received_at, d.due_at, d.completed_at,
            d.assigned_to, d.resolution_notes,
            d.verification_status, d.approval_status,
            d.created_at, d.updated_at,
            CONCAT(u.first_name, ' ', u.last_name) AS user_name,
            CONCAT(a.first_name, ' ', a.last_name) AS assigned_to_name
     FROM data_subject_requests d
     LEFT JOIN users u ON d.user_id = u.id
     LEFT JOIN users a ON d.assigned_to = a.id
     WHERE d.tenant_id = ? AND d.deleted_at IS NULL
  `;
  const params = [tenantId];

  if (filters.status) {
    query += ` AND d.status = ?`;
    params.push(filters.status);
  }

  if (filters.request_type) {
    query += ` AND d.request_type = ?`;
    params.push(filters.request_type);
  }

  if (filters.assigned_to) {
    query += ` AND d.assigned_to = ?`;
    params.push(filters.assigned_to);
  }

  if (filters.user_id) {
    query += ` AND d.user_id = ?`;
    params.push(filters.user_id);
  }

  if (filters.search) {
    query += ` AND (d.request_reference LIKE ? OR d.data_subject_identifier LIKE ? OR d.description LIKE ?)`;
    const searchPattern = `%${filters.search.trim()}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  query += ` ORDER BY d.id DESC`;

  const [rows] = await pool.query(query, params);
  return rows;
}

/**
 * Update general DSR fields
 */
async function updateDSR(tenantId, dsrId, data) {
  const existing = await getDSRById(tenantId, dsrId);
  if (!existing) {
    const err = new Error('Data Subject Request not found');
    err.status = 404;
    throw err;
  }

  const { description, due_at, assigned_to, resolution_notes, request_type } = data;
  let updateFields = [];
  let updateParams = [];

  if (description !== undefined) {
    updateFields.push('description = ?');
    updateParams.push(description || null);
  }

  if (due_at !== undefined) {
    updateFields.push('due_at = ?');
    updateParams.push(due_at || null);
  }

  if (assigned_to !== undefined) {
    if (assigned_to) {
      const [aRows] = await pool.query(
        `SELECT id FROM users WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
        [assigned_to, tenantId]
      );
      if (aRows.length === 0) {
        const err = new Error('Assigned user not found in tenant');
        err.status = 400;
        throw err;
      }
    }
    updateFields.push('assigned_to = ?');
    updateParams.push(assigned_to || null);
  }

  if (resolution_notes !== undefined) {
    updateFields.push('resolution_notes = ?');
    updateParams.push(resolution_notes || null);
  }

  if (request_type !== undefined) {
    if (!VALID_REQUEST_TYPES.includes(request_type)) {
      const err = new Error(`Invalid request_type. Must be one of: ${VALID_REQUEST_TYPES.join(', ')}`);
      err.status = 400;
      throw err;
    }
    updateFields.push('request_type = ?');
    updateParams.push(request_type);
  }

  if (updateFields.length === 0) {
    return existing;
  }

  updateParams.push(dsrId, tenantId);

  await pool.query(
    `UPDATE data_subject_requests SET ${updateFields.join(', ')} WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
    updateParams
  );

  return await getDSRById(tenantId, dsrId);
}

/**
 * Update DSR status with controlled lifecycle transitions & audit log
 */
async function updateDSRStatus(tenantId, dsrId, newStatus, resolutionNotes = null, actingUserId = null) {
  const existing = await getDSRById(tenantId, dsrId);
  if (!existing) {
    const err = new Error('Data Subject Request not found');
    err.status = 404;
    throw err;
  }

  if (!VALID_STATUSES.includes(newStatus)) {
    const err = new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const terminalStatuses = ['CLOSED', 'COMPLETED', 'REJECTED', 'CANCELLED'];
  if (terminalStatuses.includes(existing.status) && existing.status === newStatus) {
    const err = new Error(`DSR is already in terminal state '${existing.status}'`);
    err.status = 400;
    throw err;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let completedAt = existing.completed_at;
    if ((newStatus === 'CLOSED' || newStatus === 'COMPLETED') && !completedAt) {
      completedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    let updateQuery = `UPDATE data_subject_requests SET status = ?, completed_at = ?`;
    let queryParams = [newStatus, completedAt];

    if (resolutionNotes !== null && resolutionNotes !== undefined) {
      updateQuery += `, resolution_notes = ?`;
      queryParams.push(resolutionNotes.trim());
    }

    updateQuery += ` WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`;
    queryParams.push(dsrId, tenantId);

    await connection.query(updateQuery, queryParams);

    // Write audit trail
    await recordDSRHistory(
      connection,
      tenantId,
      dsrId,
      existing.status,
      newStatus,
      'STATUS_UPDATED',
      actingUserId,
      resolutionNotes || `Status updated to ${newStatus}`
    );

    await connection.commit();
    return await getDSRById(tenantId, dsrId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 1. WORKFLOW STEP: Identity Verification
 */
async function verifyIdentity(actingUserId, tenantId, dsrId, { verification_status, notes }) {
  const existing = await getDSRById(tenantId, dsrId);
  if (!existing) {
    const err = new Error('Data Subject Request not found');
    err.status = 404;
    throw err;
  }

  const validVerifications = ['PENDING', 'VERIFIED', 'FAILED'];
  if (!validVerifications.includes(verification_status)) {
    const err = new Error('verification_status must be PENDING, VERIFIED, or FAILED');
    err.status = 400;
    throw err;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let newStatus = 'IDENTITY_VERIFICATION';
    if (verification_status === 'VERIFIED') {
      newStatus = 'CASE_ASSIGNED';
    } else if (verification_status === 'FAILED') {
      newStatus = 'REJECTED';
    }

    await connection.query(
      `UPDATE data_subject_requests 
       SET verification_status = ?, verified_by = ?, verified_at = NOW(), verification_notes = ?, status = ?
       WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [verification_status, actingUserId, notes || null, newStatus, dsrId, tenantId]
    );

    const actionCode = verification_status === 'VERIFIED' ? 'IDENTITY_VERIFIED' : (verification_status === 'FAILED' ? 'IDENTITY_FAILED' : 'IDENTITY_VERIFICATION_PENDING');
    await recordDSRHistory(
      connection,
      tenantId,
      dsrId,
      existing.status,
      newStatus,
      actionCode,
      actingUserId,
      notes || `Identity verification set to ${verification_status}`
    );

    await connection.commit();
    return await getDSRById(tenantId, dsrId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 2. WORKFLOW STEP: Case Assignment
 */
async function assignCase(actingUserId, tenantId, dsrId, { assigned_to, notes }) {
  const existing = await getDSRById(tenantId, dsrId);
  if (!existing) {
    const err = new Error('Data Subject Request not found');
    err.status = 404;
    throw err;
  }

  if (!assigned_to) {
    const err = new Error('assigned_to user_id is required');
    err.status = 400;
    throw err;
  }

  const [uRows] = await pool.query(
    `SELECT id FROM users WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
    [assigned_to, tenantId]
  );
  if (uRows.length === 0) {
    const err = new Error('Assigned user not found in tenant');
    err.status = 400;
    throw err;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const newStatus = 'CASE_ASSIGNED';
    await connection.query(
      `UPDATE data_subject_requests 
       SET assigned_to = ?, status = ?
       WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [assigned_to, newStatus, dsrId, tenantId]
    );

    await recordDSRHistory(
      connection,
      tenantId,
      dsrId,
      existing.status,
      newStatus,
      'CASE_ASSIGNED',
      actingUserId,
      notes || `Case assigned to user ID ${assigned_to}`
    );

    await connection.commit();
    return await getDSRById(tenantId, dsrId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 3. WORKFLOW STEP: Data Collection
 */
async function collectData(actingUserId, tenantId, dsrId, { data_collection_notes }) {
  const existing = await getDSRById(tenantId, dsrId);
  if (!existing) {
    const err = new Error('Data Subject Request not found');
    err.status = 404;
    throw err;
  }

  if (!data_collection_notes || !data_collection_notes.trim()) {
    const err = new Error('data_collection_notes are required');
    err.status = 400;
    throw err;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const newStatus = 'DATA_COLLECTION';
    await connection.query(
      `UPDATE data_subject_requests 
       SET data_collection_notes = ?, data_collected_at = NOW(), status = ?
       WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [data_collection_notes.trim(), newStatus, dsrId, tenantId]
    );

    await recordDSRHistory(
      connection,
      tenantId,
      dsrId,
      existing.status,
      newStatus,
      'DATA_COLLECTED',
      actingUserId,
      data_collection_notes.trim()
    );

    await connection.commit();
    return await getDSRById(tenantId, dsrId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 4. WORKFLOW STEP: Approval Workflow (Enforces Approver RBAC)
 */
async function approveDSR(actingUserId, actingUserRoles, tenantId, dsrId, { approval_status, approval_notes }) {
  const existing = await getDSRById(tenantId, dsrId);
  if (!existing) {
    const err = new Error('Data Subject Request not found');
    err.status = 404;
    throw err;
  }

  const allowedApproverRoles = ['POLICY_MGR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'];
  const hasApproveRole = (actingUserRoles || []).some(r => allowedApproverRoles.includes(r));
  if (!hasApproveRole) {
    const err = new Error('Forbidden: Insufficient role permissions to approve or reject DSR requests');
    err.status = 403;
    throw err;
  }

  if (!['APPROVED', 'REJECTED'].includes(approval_status)) {
    const err = new Error('approval_status must be APPROVED or REJECTED');
    err.status = 400;
    throw err;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let newStatus = 'APPROVAL_PENDING';
    if (approval_status === 'APPROVED') {
      newStatus = 'RESPONSE_GENERATION';
    } else if (approval_status === 'REJECTED') {
      newStatus = 'REJECTED';
    }

    await connection.query(
      `UPDATE data_subject_requests 
       SET approval_status = ?, approved_by = ?, approved_at = NOW(), approval_notes = ?, status = ?
       WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [approval_status, actingUserId, approval_notes || null, newStatus, dsrId, tenantId]
    );

    const actionCode = approval_status === 'APPROVED' ? 'DSR_APPROVED' : 'APPROVAL_REJECTED';
    await recordDSRHistory(
      connection,
      tenantId,
      dsrId,
      existing.status,
      newStatus,
      actionCode,
      actingUserId,
      approval_notes || `Request set to ${approval_status}`
    );

    await connection.commit();
    return await getDSRById(tenantId, dsrId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 5. WORKFLOW STEP: Response Generation
 */
async function generateResponse(actingUserId, tenantId, dsrId, { response_summary, response_file_name }) {
  const existing = await getDSRById(tenantId, dsrId);
  if (!existing) {
    const err = new Error('Data Subject Request not found');
    err.status = 404;
    throw err;
  }

  if (!response_summary || !response_summary.trim()) {
    const err = new Error('response_summary is required');
    err.status = 400;
    throw err;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const newStatus = 'RESPONSE_GENERATION';
    await connection.query(
      `UPDATE data_subject_requests 
       SET response_summary = ?, response_file_name = ?, status = ?
       WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [response_summary.trim(), response_file_name || null, newStatus, dsrId, tenantId]
    );

    await recordDSRHistory(
      connection,
      tenantId,
      dsrId,
      existing.status,
      newStatus,
      'RESPONSE_GENERATED',
      actingUserId,
      response_summary.trim()
    );

    await connection.commit();
    return await getDSRById(tenantId, dsrId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 6. WORKFLOW STEP: Closure
 */
async function closeDSR(actingUserId, tenantId, dsrId, { resolution_notes }) {
  const existing = await getDSRById(tenantId, dsrId);
  if (!existing) {
    const err = new Error('Data Subject Request not found');
    err.status = 404;
    throw err;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const newStatus = 'CLOSED';
    await connection.query(
      `UPDATE data_subject_requests 
       SET status = ?, completed_at = NOW(), resolution_notes = ?
       WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [newStatus, resolution_notes || existing.resolution_notes || 'Request successfully closed', dsrId, tenantId]
    );

    await recordDSRHistory(
      connection,
      tenantId,
      dsrId,
      existing.status,
      newStatus,
      'DSR_CLOSED',
      actingUserId,
      resolution_notes || 'Case closed'
    );

    await connection.commit();
    return await getDSRById(tenantId, dsrId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 7. Read-only Audit Log / History for DSR
 */
async function getDSRHistory(tenantId, dsrId) {
  const existing = await getDSRById(tenantId, dsrId);
  if (!existing) {
    const err = new Error('Data Subject Request not found');
    err.status = 404;
    throw err;
  }

  const [rows] = await pool.query(
    `SELECT h.id, h.tenant_id, h.dsr_id, h.previous_status, h.new_status, h.action,
            h.performed_by, h.performed_at, h.notes, h.metadata,
            CONCAT(u.first_name, ' ', u.last_name) AS performer_name,
            u.email AS performer_email
     FROM dsr_history h
     LEFT JOIN users u ON h.performed_by = u.id
     WHERE h.dsr_id = ? AND h.tenant_id = ?
     ORDER BY h.performed_at ASC, h.id ASC`,
    [dsrId, tenantId]
  );
  return rows;
}

/**
 * Soft delete DSR
 */
async function deleteDSR(tenantId, dsrId) {
  const existing = await getDSRById(tenantId, dsrId);
  if (!existing) {
    const err = new Error('Data Subject Request not found');
    err.status = 404;
    throw err;
  }

  await pool.query(
    `UPDATE data_subject_requests SET deleted_at = NOW() WHERE id = ? AND tenant_id = ?`,
    [dsrId, tenantId]
  );

  return { message: 'Data Subject Request deleted successfully' };
}

/**
 * Fetch Summary Stats
 */
async function getPrivacySummaryStats(tenantId) {
  const [consentRows] = await pool.query(
    `SELECT 
       COUNT(*) AS total_consents,
       SUM(CASE WHEN status = 'GRANTED' THEN 1 ELSE 0 END) AS granted,
       SUM(CASE WHEN status = 'DENIED' THEN 1 ELSE 0 END) AS denied,
       SUM(CASE WHEN status = 'WITHDRAWN' THEN 1 ELSE 0 END) AS withdrawn,
       SUM(CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 1 ELSE 0 END) AS expired
     FROM consent_records
     WHERE tenant_id = ? AND deleted_at IS NULL`,
    [tenantId]
  );

  const [purposeRows] = await pool.query(
    `SELECT 
       SUM(CASE WHEN status = 'ACTIVE' AND deleted_at IS NULL THEN 1 ELSE 0 END) AS active_purposes,
       SUM(CASE WHEN status = 'ARCHIVED' OR deleted_at IS NOT NULL THEN 1 ELSE 0 END) AS archived_purposes
     FROM consent_purposes
     WHERE tenant_id = ?`,
    [tenantId]
  );

  const [dsrRows] = await pool.query(
    `SELECT 
       COUNT(*) AS total_dsrs,
       SUM(CASE WHEN status IN ('RECEIVED', 'SUBMITTED') THEN 1 ELSE 0 END) AS received,
       SUM(CASE WHEN status IN ('IN_REVIEW', 'IDENTITY_VERIFICATION', 'CASE_ASSIGNED') THEN 1 ELSE 0 END) AS in_review,
       SUM(CASE WHEN status IN ('IN_PROGRESS', 'DATA_COLLECTION', 'APPROVAL_PENDING', 'RESPONSE_GENERATION') THEN 1 ELSE 0 END) AS in_progress,
       SUM(CASE WHEN status IN ('COMPLETED', 'CLOSED') THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
       SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled
     FROM data_subject_requests
     WHERE tenant_id = ? AND deleted_at IS NULL`,
    [tenantId]
  );

  const consents = consentRows[0] || {};
  const purposes = purposeRows[0] || {};
  const dsrs = dsrRows[0] || {};

  return {
    consents: {
      total: Number(consents.total_consents || 0),
      granted: Number(consents.granted || 0),
      denied: Number(consents.denied || 0),
      withdrawn: Number(consents.withdrawn || 0),
      expired: Number(consents.expired || 0)
    },
    purposes: {
      active: Number(purposes.active_purposes || 0),
      archived: Number(purposes.archived_purposes || 0)
    },
    dsr: {
      total: Number(dsrs.total_dsrs || 0),
      received: Number(dsrs.received || 0),
      in_review: Number(dsrs.in_review || 0),
      in_progress: Number(dsrs.in_progress || 0),
      completed: Number(dsrs.completed || 0),
      rejected: Number(dsrs.rejected || 0),
      cancelled: Number(dsrs.cancelled || 0)
    }
  };
}

module.exports = {
  createDSR,
  getDSRById,
  getDSRs,
  updateDSR,
  updateDSRStatus,
  verifyIdentity,
  assignCase,
  collectData,
  approveDSR,
  generateResponse,
  closeDSR,
  getDSRHistory,
  deleteDSR,
  getPrivacySummaryStats
};
