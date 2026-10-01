const pool = require('../config/database');
const { logSystemEvent } = require('./systemAuditService');

async function listRoPARecords(tenantId, filters = {}) {
  let query = `
    SELECT r.*, u.email AS creator_email
    FROM ropa_records r
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.tenant_id = ? AND r.deleted_at IS NULL
  `;
  const params = [tenantId];

  if (filters.status) {
    query += ` AND r.status = ?`;
    params.push(filters.status);
  }

  if (filters.legal_basis) {
    query += ` AND r.legal_basis = ?`;
    params.push(filters.legal_basis);
  }

  if (filters.search) {
    query += ` AND (r.activity_name LIKE ? OR r.ropa_code LIKE ? OR r.controller_name LIKE ?)`;
    const pattern = `%${filters.search.trim()}%`;
    params.push(pattern, pattern, pattern);
  }

  query += ` ORDER BY r.id DESC`;
  const [rows] = await pool.query(query, params);
  return rows;
}

async function getRoPAById(tenantId, ropaId) {
  const [rows] = await pool.query(
    `SELECT r.*, u.email AS creator_email
     FROM ropa_records r
     LEFT JOIN users u ON r.created_by = u.id
     WHERE r.id = ? AND r.tenant_id = ? AND r.deleted_at IS NULL`,
    [ropaId, tenantId]
  );
  if (rows.length === 0) return null;

  const ropa = rows[0];
  const [history] = await pool.query(
    `SELECT h.*, u.email AS performer_email FROM ropa_history h
     LEFT JOIN users u ON h.performed_by = u.id
     WHERE h.ropa_id = ? AND h.tenant_id = ?
     ORDER BY h.performed_at ASC`,
    [ropaId, tenantId]
  );
  ropa.history = history;
  return ropa;
}

async function createRoPARecord(actingUserId, tenantId, data, reqContext = {}) {
  const {
    activity_name,
    purpose_description,
    data_subject_categories,
    personal_data_categories,
    legal_basis,
    data_sources,
    recipients,
    data_sharing_details,
    retention_period,
    security_measures,
    controller_name,
    processor_name,
    dpo_contact
  } = data;

  if (!activity_name || !activity_name.trim() || !purpose_description || !legal_basis || !retention_period || !controller_name) {
    const err = new Error('activity_name, purpose_description, legal_basis, retention_period, and controller_name are required');
    err.status = 400;
    throw err;
  }

  const ropaCode = `ROPA-${Date.now()}`;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [res] = await connection.query(
      `INSERT INTO ropa_records
       (tenant_id, ropa_code, activity_name, purpose_description, data_subject_categories, personal_data_categories, legal_basis, data_sources, recipients, data_sharing_details, retention_period, security_measures, controller_name, processor_name, dpo_contact, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
      [
        tenantId,
        ropaCode,
        activity_name.trim(),
        purpose_description.trim(),
        data_subject_categories || 'Customers, Employees',
        personal_data_categories || 'Contact Info, Identifiers',
        legal_basis.trim(),
        data_sources || null,
        recipients || null,
        data_sharing_details || null,
        retention_period.trim(),
        security_measures || 'TLS Encryption, RBAC',
        controller_name.trim(),
        processor_name || null,
        dpo_contact || null,
        actingUserId || null
      ]
    );

    const ropaId = res.insertId;

    await connection.query(
      `INSERT INTO ropa_history
       (tenant_id, ropa_id, previous_status, new_status, action, performed_by, notes)
       VALUES (?, ?, 'NONE', 'ACTIVE', 'ROPA_CREATED', ?, 'Initial RoPA record created')`,
      [tenantId, ropaId, actingUserId || null]
    );

    await connection.commit();

    await logSystemEvent(tenantId, actingUserId, null, 'CREATE_ROPA', 'ROPA', 'ROPA', ropaId, { activity_name, ropaCode }, reqContext);

    return await getRoPAById(tenantId, ropaId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateRoPARecord(actingUserId, tenantId, ropaId, data, reqContext = {}) {
  const ropa = await getRoPAById(tenantId, ropaId);
  if (!ropa) {
    const err = new Error('RoPA record not found');
    err.status = 404;
    throw err;
  }

  const {
    activity_name,
    purpose_description,
    data_subject_categories,
    personal_data_categories,
    legal_basis,
    retention_period,
    security_measures,
    controller_name,
    status
  } = data;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE ropa_records
       SET activity_name = ?, purpose_description = ?, data_subject_categories = ?, personal_data_categories = ?, legal_basis = ?, retention_period = ?, security_measures = ?, controller_name = ?, status = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        activity_name ? activity_name.trim() : ropa.activity_name,
        purpose_description ? purpose_description.trim() : ropa.purpose_description,
        data_subject_categories || ropa.data_subject_categories,
        personal_data_categories || ropa.personal_data_categories,
        legal_basis || ropa.legal_basis,
        retention_period || ropa.retention_period,
        security_measures || ropa.security_measures,
        controller_name || ropa.controller_name,
        status || ropa.status,
        ropaId,
        tenantId
      ]
    );

    if (status && status !== ropa.status) {
      await connection.query(
        `INSERT INTO ropa_history
         (tenant_id, ropa_id, previous_status, new_status, action, performed_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, ropaId, ropa.status, status, `STATUS_CHANGED_TO_${status}`, actingUserId || null, `RoPA status changed to ${status}`]
      );
    }

    await connection.commit();

    await logSystemEvent(tenantId, actingUserId, null, 'UPDATE_ROPA', 'ROPA', 'ROPA', ropaId, { ropaCode: ropa.ropa_code }, reqContext);

    return await getRoPAById(tenantId, ropaId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function archiveRoPARecord(actingUserId, tenantId, ropaId, reqContext = {}) {
  const ropa = await getRoPAById(tenantId, ropaId);
  if (!ropa) {
    const err = new Error('RoPA record not found');
    err.status = 404;
    throw err;
  }

  await pool.query(
    `UPDATE ropa_records SET status = 'ARCHIVED', deleted_at = NOW() WHERE id = ? AND tenant_id = ?`,
    [ropaId, tenantId]
  );

  await logSystemEvent(tenantId, actingUserId, null, 'ARCHIVE_ROPA', 'ROPA', 'ROPA', ropaId, { ropaCode: ropa.ropa_code }, reqContext);

  return { message: 'RoPA record archived successfully', id: ropaId };
}

module.exports = {
  listRoPARecords,
  getRoPAById,
  createRoPARecord,
  updateRoPARecord,
  archiveRoPARecord
};
