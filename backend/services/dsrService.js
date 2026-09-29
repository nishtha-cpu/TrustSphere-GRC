const pool = require('../config/database');

/**
 * ==========================================
 * DATA SUBJECT REQUEST (DSR) SERVICE
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
  'RECTIFICATION',
  'ERASURE',
  'RESTRICTION',
  'PORTABILITY',
  'OBJECTION'
];

const VALID_STATUSES = [
  'RECEIVED',
  'IN_REVIEW',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
  'CANCELLED'
];

/**
 * Create a new Data Subject Request
 */
async function createDSR(tenantId, data) {
  const {
    data_subject_identifier,
    user_id,
    request_type,
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
  // Default due date: 30 days from now (GDPR standard)
  const defaultDue = due_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

  const [result] = await pool.query(
    `INSERT INTO data_subject_requests 
     (tenant_id, request_reference, data_subject_identifier, user_id, request_type, status, description, received_at, due_at, assigned_to, resolution_notes)
     VALUES (?, ?, ?, ?, ?, 'RECEIVED', ?, NOW(), ?, ?, ?)`,
    [
      tenantId,
      reference,
      data_subject_identifier.trim().toLowerCase(),
      user_id || null,
      request_type,
      description || null,
      defaultDue,
      assigned_to || null,
      resolution_notes || null
    ]
  );

  return await getDSRById(tenantId, result.insertId);
}

/**
 * Get DSR by ID for authenticated tenant
 */
async function getDSRById(tenantId, dsrId) {
  const [rows] = await pool.query(
    `SELECT d.id, d.tenant_id, d.request_reference, d.data_subject_identifier, d.user_id,
            d.request_type, d.status, d.description, d.received_at, d.due_at, d.completed_at,
            d.assigned_to, d.resolution_notes, d.created_at, d.updated_at,
            CONCAT(u.first_name, ' ', u.last_name) AS user_name,
            CONCAT(a.first_name, ' ', a.last_name) AS assigned_to_name
     FROM data_subject_requests d
     LEFT JOIN users u ON d.user_id = u.id
     LEFT JOIN users a ON d.assigned_to = a.id
     WHERE d.id = ? AND d.tenant_id = ? AND d.deleted_at IS NULL`,
    [dsrId, tenantId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * List DSRs for authenticated tenant with filtering & search
 */
async function getDSRs(tenantId, filters = {}) {
  let query = `
    SELECT d.id, d.tenant_id, d.request_reference, d.data_subject_identifier, d.user_id,
            d.request_type, d.status, d.description, d.received_at, d.due_at, d.completed_at,
            d.assigned_to, d.resolution_notes, d.created_at, d.updated_at,
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
 * Update DSR fields
 */
async function updateDSR(tenantId, dsrId, data) {
  const existing = await getDSRById(tenantId, dsrId);
  if (!existing) {
    const err = new Error('Data Subject Request not found');
    err.status = 404;
    throw err;
  }

  const {
    description,
    due_at,
    assigned_to,
    resolution_notes,
    request_type
  } = data;

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
 * Update DSR status with controlled lifecycle transitions
 */
async function updateDSRStatus(tenantId, dsrId, newStatus, resolutionNotes = null) {
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

  // Lifecycle rules: cannot transition out of terminal state (COMPLETED, REJECTED, CANCELLED) to same terminal or invalid state
  const terminalStatuses = ['COMPLETED', 'REJECTED', 'CANCELLED'];
  if (terminalStatuses.includes(existing.status) && existing.status === newStatus) {
    const err = new Error(`DSR is already in terminal state '${existing.status}'`);
    err.status = 400;
    throw err;
  }

  let completedAt = existing.completed_at;
  if (newStatus === 'COMPLETED' && !completedAt) {
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

  await pool.query(updateQuery, queryParams);

  return await getDSRById(tenantId, dsrId);
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
 * Fetch Privacy & Consent Summary Dashboard Statistics for authenticated tenant
 */
async function getPrivacySummaryStats(tenantId) {
  // 1. Consent Stats
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

  // 2. Purpose Stats
  const [purposeRows] = await pool.query(
    `SELECT 
       SUM(CASE WHEN status = 'ACTIVE' AND deleted_at IS NULL THEN 1 ELSE 0 END) AS active_purposes,
       SUM(CASE WHEN status = 'ARCHIVED' OR deleted_at IS NOT NULL THEN 1 ELSE 0 END) AS archived_purposes
     FROM consent_purposes
     WHERE tenant_id = ?`,
    [tenantId]
  );

  // 3. DSR Stats
  const [dsrRows] = await pool.query(
    `SELECT 
       COUNT(*) AS total_dsrs,
       SUM(CASE WHEN status = 'RECEIVED' THEN 1 ELSE 0 END) AS received,
       SUM(CASE WHEN status = 'IN_REVIEW' THEN 1 ELSE 0 END) AS in_review,
       SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress,
       SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
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
  deleteDSR,
  getPrivacySummaryStats
};
