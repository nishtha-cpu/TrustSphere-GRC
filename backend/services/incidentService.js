const pool = require('../config/database');
const { logSystemEvent } = require('./systemAuditService');

async function listIncidents(tenantId, filters = {}) {
  let query = `
    SELECT i.*, u.email AS owner_email
    FROM privacy_incidents i
    LEFT JOIN users u ON i.owner_id = u.id
    WHERE i.tenant_id = ? AND i.deleted_at IS NULL
  `;
  const params = [tenantId];

  if (filters.status) {
    query += ` AND i.status = ?`;
    params.push(filters.status);
  }

  if (filters.severity) {
    query += ` AND i.severity = ?`;
    params.push(filters.severity);
  }

  if (filters.search) {
    query += ` AND (i.title LIKE ? OR i.incident_number LIKE ?)`;
    const pattern = `%${filters.search.trim()}%`;
    params.push(pattern, pattern);
  }

  query += ` ORDER BY i.id DESC`;
  const [rows] = await pool.query(query, params);
  return rows;
}

async function getIncidentById(tenantId, incidentId) {
  const [rows] = await pool.query(
    `SELECT i.*, u.email AS owner_email
     FROM privacy_incidents i
     LEFT JOIN users u ON i.owner_id = u.id
     WHERE i.id = ? AND i.tenant_id = ? AND i.deleted_at IS NULL`,
    [incidentId, tenantId]
  );
  if (rows.length === 0) return null;

  const incident = rows[0];

  const [history] = await pool.query(
    `SELECT h.*, u.email AS performer_email FROM incident_history h
     LEFT JOIN users u ON h.performed_by = u.id
     WHERE h.incident_id = ? AND h.tenant_id = ?
     ORDER BY h.performed_at ASC`,
    [incidentId, tenantId]
  );

  incident.history = history;
  return incident;
}

async function createIncident(actingUserId, tenantId, data, reqContext = {}) {
  const {
    title,
    description,
    discovery_date = new Date().toISOString(),
    affected_data_categories,
    affected_subjects_count = 0,
    severity = 'MEDIUM',
    classification = 'DATA_LEAK',
    owner_id
  } = data;

  if (!title || !title.trim() || !description || !affected_data_categories) {
    const err = new Error('title, description, and affected_data_categories are required');
    err.status = 400;
    throw err;
  }

  const incidentNumber = `INC-${Date.now()}`;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [res] = await connection.query(
      `INSERT INTO privacy_incidents
       (tenant_id, incident_number, title, description, discovery_date, affected_data_categories, affected_subjects_count, severity, classification, status, owner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'IDENTIFICATION', ?)`,
      [
        tenantId,
        incidentNumber,
        title.trim(),
        description.trim(),
        new Date(discovery_date),
        affected_data_categories.trim(),
        Number(affected_subjects_count || 0),
        severity,
        classification,
        owner_id || actingUserId || null
      ]
    );

    const incidentId = res.insertId;

    await connection.query(
      `INSERT INTO incident_history
       (tenant_id, incident_id, previous_status, new_status, action, performed_by, notes)
       VALUES (?, ?, 'NONE', 'IDENTIFICATION', 'INCIDENT_CREATED', ?, 'Privacy incident logged')`,
      [tenantId, incidentId, actingUserId || null]
    );

    await connection.commit();

    await logSystemEvent(tenantId, actingUserId, null, 'CREATE_INCIDENT', 'INCIDENT', 'INCIDENT', incidentId, { incidentNumber, title }, reqContext);

    return await getIncidentById(tenantId, incidentId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateIncidentStatus(actingUserId, tenantId, incidentId, bodyData = {}, reqContext = {}) {
  const incident = await getIncidentById(tenantId, incidentId);
  if (!incident) {
    const err = new Error('Privacy incident not found');
    err.status = 404;
    throw err;
  }

  const {
    status,
    investigation_notes,
    containment_actions,
    notification_required,
    notification_status,
    notes
  } = bodyData;

  const validStatuses = ['IDENTIFICATION', 'CLASSIFICATION', 'INVESTIGATION', 'CONTAINMENT', 'NOTIFICATION', 'REMEDIATION', 'CLOSED'];
  if (status && !validStatuses.includes(status)) {
    const err = new Error(`Invalid incident status ${status}`);
    err.status = 400;
    throw err;
  }

  const nextStatus = status || incident.status;
  const isClosing = nextStatus === 'CLOSED';

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE privacy_incidents
       SET status = ?, 
           investigation_notes = COALESCE(?, investigation_notes),
           containment_actions = COALESCE(?, containment_actions),
           notification_required = COALESCE(?, notification_required),
           notification_status = COALESCE(?, notification_status),
           closed_at = CASE WHEN ? = 'CLOSED' THEN NOW() ELSE closed_at END
       WHERE id = ? AND tenant_id = ?`,
      [
        nextStatus,
        investigation_notes || null,
        containment_actions || null,
        notification_required !== undefined ? Boolean(notification_required) : null,
        notification_status || null,
        nextStatus,
        incidentId,
        tenantId
      ]
    );

    if (nextStatus !== incident.status) {
      await connection.query(
        `INSERT INTO incident_history
         (tenant_id, incident_id, previous_status, new_status, action, performed_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, incidentId, incident.status, nextStatus, `STATUS_CHANGED_TO_${nextStatus}`, actingUserId || null, notes || `Status changed to ${nextStatus}`]
      );
    }

    await connection.commit();

    await logSystemEvent(tenantId, actingUserId, null, 'UPDATE_INCIDENT_STATUS', 'INCIDENT', 'INCIDENT', incidentId, { from: incident.status, to: nextStatus }, reqContext);

    return await getIncidentById(tenantId, incidentId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  listIncidents,
  getIncidentById,
  createIncident,
  updateIncidentStatus
};
