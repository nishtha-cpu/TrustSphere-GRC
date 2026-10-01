const pool = require('../config/database');

async function logSystemEvent(tenantId, userId, userEmail, action, module, entityType = null, entityId = null, details = null, reqContext = {}) {
  try {
    await pool.query(
      `INSERT INTO system_audit_logs
       (tenant_id, user_id, user_email, action, module, entity_type, entity_id, ip_address, user_agent, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        userId || null,
        userEmail || null,
        action,
        module,
        entityType,
        entityId || null,
        reqContext.ip || null,
        reqContext.userAgent || null,
        details ? JSON.stringify(details) : null
      ]
    );
  } catch (err) {
    console.error('System Audit Log Error:', err);
  }
}

async function getSystemAuditLogs(tenantId, filters = {}) {
  let query = `SELECT * FROM system_audit_logs WHERE tenant_id = ?`;
  const params = [tenantId];

  if (filters.module) {
    query += ` AND module = ?`;
    params.push(filters.module);
  }

  if (filters.action) {
    query += ` AND action = ?`;
    params.push(filters.action);
  }

  query += ` ORDER BY id DESC LIMIT 100`;
  const [rows] = await pool.query(query, params);
  return rows;
}

module.exports = {
  logSystemEvent,
  getSystemAuditLogs
};
