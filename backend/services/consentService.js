const pool = require('../config/database');

/**
 * ==========================================
 * CONSENT PURPOSES SERVICE
 * ==========================================
 */

/**
 * List consent purposes for authenticated tenant
 */
async function getConsentPurposes(tenantId, filters = {}) {
  let query = `
    SELECT id, tenant_id, purpose_code, name, description, legal_basis, status, version, created_at, updated_at
    FROM consent_purposes
    WHERE tenant_id = ?
  `;
  const params = [tenantId];

  if (typeof filters === 'boolean') {
    filters = { includeInactive: filters };
  }

  if (filters.status) {
    query += ` AND status = ?`;
    params.push(filters.status);
  } else {
    query += ` AND deleted_at IS NULL`;
    if (!filters.includeInactive) {
      query += ` AND status = 'ACTIVE'`;
    }
  }

  if (filters.legal_basis) {
    query += ` AND legal_basis = ?`;
    params.push(filters.legal_basis);
  }

  if (filters.search) {
    query += ` AND (purpose_code LIKE ? OR name LIKE ? OR description LIKE ?)`;
    const searchPattern = `%${filters.search.trim()}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  query += ` ORDER BY id ASC`;

  const [rows] = await pool.query(query, params);
  return rows;
}

/**
 * Get single consent purpose by ID for authenticated tenant
 */
async function getConsentPurposeById(tenantId, purposeId) {
  const [rows] = await pool.query(
    `SELECT id, tenant_id, purpose_code, name, description, legal_basis, status, version, created_at, updated_at
     FROM consent_purposes
     WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
    [purposeId, tenantId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Create a new consent purpose for authenticated tenant
 */
async function createConsentPurpose(tenantId, data) {
  const { purpose_code, name, description, legal_basis = 'CONSENT', status = 'ACTIVE' } = data;

  if (!purpose_code || !purpose_code.trim()) {
    const err = new Error('purpose_code is required');
    err.status = 400;
    throw err;
  }

  if (!name || !name.trim()) {
    const err = new Error('name is required');
    err.status = 400;
    throw err;
  }

  const validLegalBases = ['CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS'];
  if (!validLegalBases.includes(legal_basis)) {
    const err = new Error(`Invalid legal_basis. Must be one of: ${validLegalBases.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const validStatuses = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];
  if (!validStatuses.includes(status)) {
    const err = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const cleanCode = purpose_code.trim().toUpperCase();

  // Check unique purpose_code per tenant
  const [existing] = await pool.query(
    `SELECT id FROM consent_purposes WHERE tenant_id = ? AND UPPER(purpose_code) = ? AND deleted_at IS NULL`,
    [tenantId, cleanCode]
  );

  if (existing.length > 0) {
    const err = new Error('Purpose code already exists in tenant');
    err.status = 400;
    throw err;
  }

  const [result] = await pool.query(
    `INSERT INTO consent_purposes (tenant_id, purpose_code, name, description, legal_basis, status, version)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [tenantId, cleanCode, name.trim(), description || null, legal_basis, status]
  );

  return await getConsentPurposeById(tenantId, result.insertId);
}

/**
 * Update consent purpose details
 */
async function updateConsentPurpose(tenantId, purposeId, data) {
  const purpose = await getConsentPurposeById(tenantId, purposeId);
  if (!purpose) {
    const err = new Error('Consent purpose not found');
    err.status = 404;
    throw err;
  }

  const { name, description, legal_basis, status } = data;
  let updateFields = [];
  let updateParams = [];

  if (name !== undefined && name.trim()) {
    updateFields.push('name = ?');
    updateParams.push(name.trim());
  }

  if (description !== undefined) {
    updateFields.push('description = ?');
    updateParams.push(description || null);
  }

  if (legal_basis !== undefined) {
    const validLegalBases = ['CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS'];
    if (!validLegalBases.includes(legal_basis)) {
      const err = new Error(`Invalid legal_basis. Must be one of: ${validLegalBases.join(', ')}`);
      err.status = 400;
      throw err;
    }
    updateFields.push('legal_basis = ?');
    updateParams.push(legal_basis);
  }

  if (status !== undefined) {
    const validStatuses = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];
    if (!validStatuses.includes(status)) {
      const err = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      err.status = 400;
      throw err;
    }
    updateFields.push('status = ?');
    updateParams.push(status);
  }

  if (updateFields.length === 0) {
    return purpose;
  }

  updateFields.push('version = version + 1');
  updateParams.push(purposeId, tenantId);

  await pool.query(
    `UPDATE consent_purposes SET ${updateFields.join(', ')} WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
    updateParams
  );

  return await getConsentPurposeById(tenantId, purposeId);
}

/**
 * Soft delete consent purpose
 */
async function deleteConsentPurpose(tenantId, purposeId) {
  const purpose = await getConsentPurposeById(tenantId, purposeId);
  if (!purpose) {
    const err = new Error('Consent purpose not found');
    err.status = 404;
    throw err;
  }

  await pool.query(
    `UPDATE consent_purposes SET deleted_at = NOW(), status = 'ARCHIVED' WHERE id = ? AND tenant_id = ?`,
    [purposeId, tenantId]
  );

  return {
    message: 'Consent purpose archived successfully',
    data: { ...purpose, status: 'ARCHIVED' }
  };
}

/**
 * ==========================================
 * CONSENT RECORDS SERVICE
 * ==========================================
 */

/**
 * Get consent record by ID for authenticated tenant
 */
async function getConsentById(tenantId, consentId) {
  const [rows] = await pool.query(
    `SELECT c.id, c.tenant_id, c.purpose_id, c.user_id, c.data_subject_identifier, c.status,
            c.consent_version, c.source, c.ip_address, c.user_agent, c.collected_at,
            c.withdrawn_at, c.expires_at, c.metadata, c.created_at, c.updated_at,
            p.name AS purpose_name, p.purpose_code, p.legal_basis
     FROM consent_records c
     JOIN consent_purposes p ON c.purpose_id = p.id
     WHERE c.id = ? AND c.tenant_id = ? AND c.deleted_at IS NULL`,
    [consentId, tenantId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * List consent records for authenticated tenant with optional filters
 */
async function getConsents(tenantId, filters = {}) {
  let query = `
    SELECT c.id, c.tenant_id, c.purpose_id, c.user_id, c.data_subject_identifier, c.status,
            c.consent_version, c.source, c.collected_at, c.withdrawn_at, c.expires_at,
            p.name AS purpose_name, p.purpose_code
     FROM consent_records c
     JOIN consent_purposes p ON c.purpose_id = p.id
     WHERE c.tenant_id = ? AND c.deleted_at IS NULL
  `;
  const params = [tenantId];

  if (filters.purpose_id) {
    query += ` AND c.purpose_id = ?`;
    params.push(filters.purpose_id);
  }

  if (filters.status) {
    query += ` AND c.status = ?`;
    params.push(filters.status);
  }

  if (filters.data_subject_identifier) {
    query += ` AND c.data_subject_identifier = ?`;
    params.push(filters.data_subject_identifier);
  }

  if (filters.user_id) {
    query += ` AND c.user_id = ?`;
    params.push(filters.user_id);
  }

  if (filters.search) {
    query += ` AND (c.data_subject_identifier LIKE ? OR c.source LIKE ? OR p.name LIKE ? OR p.purpose_code LIKE ?)`;
    const searchPattern = `%${filters.search.trim()}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  query += ` ORDER BY c.id DESC`;

  const [rows] = await pool.query(query, params);
  return rows;
}

/**
 * Create a new consent record (Atomic Transaction with initial history entry)
 */
async function createConsentRecord(actingUserId, tenantId, data, reqContext = {}) {
  const {
    purpose_id,
    user_id,
    data_subject_identifier,
    status = 'GRANTED',
    consent_version = '1.0',
    source = 'WEB_PORTAL',
    expires_at,
    metadata
  } = data;

  if (!purpose_id) {
    const err = new Error('purpose_id is required');
    err.status = 400;
    throw err;
  }

  // Verify purpose exists in tenant and is ACTIVE
  const purpose = await getConsentPurposeById(tenantId, purpose_id);
  if (!purpose) {
    const err = new Error('Consent purpose not found in tenant');
    err.status = 400;
    throw err;
  }

  if (purpose.status !== 'ACTIVE') {
    const err = new Error('Consent purpose is inactive or archived');
    err.status = 400;
    throw err;
  }

  // Validate user_id if provided
  let subjectId = data_subject_identifier;
  if (user_id) {
    const [userRows] = await pool.query(
      `SELECT id, email FROM users WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [user_id, tenantId]
    );
    if (userRows.length === 0) {
      const err = new Error('Referenced user_id not found in tenant');
      err.status = 400;
      throw err;
    }
    if (!subjectId) {
      subjectId = userRows[0].email;
    }
  }

  if (!subjectId || !subjectId.trim()) {
    const err = new Error('data_subject_identifier or valid user_id is required');
    err.status = 400;
    throw err;
  }

  const validStatuses = ['GRANTED', 'DENIED'];
  if (!validStatuses.includes(status)) {
    const err = new Error(`Invalid initial consent status. Must be GRANTED or DENIED`);
    err.status = 400;
    throw err;
  }

  if (!consent_version || !consent_version.trim()) {
    const err = new Error('consent_version is required');
    err.status = 400;
    throw err;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Insert consent record
    const [result] = await connection.query(
      `INSERT INTO consent_records 
       (tenant_id, purpose_id, user_id, data_subject_identifier, status, consent_version, source, ip_address, user_agent, collected_at, expires_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        tenantId,
        purpose_id,
        user_id || null,
        subjectId.trim().toLowerCase(),
        status,
        consent_version.trim(),
        source || 'WEB_PORTAL',
        reqContext.ip || null,
        reqContext.userAgent || null,
        expires_at || null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    const consentRecordId = result.insertId;

    // Insert initial consent history entry
    const action = status === 'GRANTED' ? 'CONSENT_GIVEN' : 'CONSENT_DENIED';
    await connection.query(
      `INSERT INTO consent_history 
       (tenant_id, consent_record_id, previous_status, new_status, action, source, performed_by, performed_at, ip_address, user_agent, notes, metadata)
       VALUES (?, ?, 'NONE', ?, ?, ?, ?, NOW(), ?, ?, 'Initial consent record created', ?)`,
      [
        tenantId,
        consentRecordId,
        status,
        action,
        source || 'WEB_PORTAL',
        actingUserId || null,
        reqContext.ip || null,
        reqContext.userAgent || null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    await connection.commit();

    return await getConsentById(tenantId, consentRecordId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Withdraw consent (Atomic Transaction with audit trail insertion)
 */
async function withdrawConsent(actingUserId, tenantId, consentId, bodyData = {}, reqContext = {}) {
  const record = await getConsentById(tenantId, consentId);
  if (!record) {
    const err = new Error('Consent record not found');
    err.status = 404;
    throw err;
  }

  if (record.status !== 'GRANTED') {
    const err = new Error(`Consent is not in GRANTED state; current status is ${record.status}`);
    err.status = 400;
    throw err;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Update status in consent_records
    await connection.query(
      `UPDATE consent_records 
       SET status = 'WITHDRAWN', withdrawn_at = NOW() 
       WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
      [consentId, tenantId]
    );

    // 2. Insert immutable row in consent_history
    await connection.query(
      `INSERT INTO consent_history 
       (tenant_id, consent_record_id, previous_status, new_status, action, source, performed_by, performed_at, ip_address, user_agent, notes, metadata)
       VALUES (?, ?, 'GRANTED', 'WITHDRAWN', 'CONSENT_WITHDRAWN', ?, ?, NOW(), ?, ?, ?, ?)`,
      [
        tenantId,
        consentId,
        bodyData.source || record.source || 'WEB_PORTAL',
        actingUserId || null,
        reqContext.ip || null,
        reqContext.userAgent || null,
        bodyData.notes || 'Consent withdrawn by user/data subject',
        bodyData.metadata ? JSON.stringify(bodyData.metadata) : null
      ]
    );

    await connection.commit();

    return await getConsentById(tenantId, consentId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * ==========================================
 * CONSENT HISTORY SERVICE (READ ONLY)
 * ==========================================
 */

/**
 * Get read-only consent history for a consent record
 */
async function getConsentHistory(tenantId, consentId) {
  const record = await getConsentById(tenantId, consentId);
  if (!record) {
    const err = new Error('Consent record not found');
    err.status = 404;
    throw err;
  }

  const [rows] = await pool.query(
    `SELECT h.id, h.tenant_id, h.consent_record_id, h.previous_status, h.new_status,
            h.action, h.source, h.performed_by, h.performed_at, h.ip_address, h.user_agent,
            h.notes, h.metadata,
            u.first_name, u.last_name, u.email AS performer_email
     FROM consent_history h
     LEFT JOIN users u ON h.performed_by = u.id
     WHERE h.consent_record_id = ? AND h.tenant_id = ?
     ORDER BY h.performed_at ASC, h.id ASC`,
    [consentId, tenantId]
  );

  return rows;
}

module.exports = {
  getConsentPurposes,
  getConsentPurposeById,
  createConsentPurpose,
  updateConsentPurpose,
  deleteConsentPurpose,
  getConsents,
  getConsentById,
  createConsentRecord,
  withdrawConsent,
  getConsentHistory
};
