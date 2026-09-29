const pool = require('../config/database');

/**
 * Service to handle Audit Team Assignment operations
 */

const VALID_AUDIT_ROLES = [
  'LEAD_AUDITOR',
  'AUDITOR',
  'OBSERVER',
  'SUBJECT_MATTER_EXPERT'
];

/**
 * Helper to check audit existence and tenant ownership
 */
async function getAuditForTenant(audit_id, tenant_id, connection = pool) {
  const query = `
    SELECT id, tenant_id, lead_auditor_id, status 
    FROM audits 
    WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
  `;
  const [rows] = await connection.query(query, [audit_id, tenant_id]);
  return rows.length ? rows[0] : null;
}

/**
 * Helper to check user existence and tenant ownership
 */
async function getUserForTenant(user_id, tenant_id, connection = pool) {
  const query = `
    SELECT id, tenant_id, first_name, last_name, email 
    FROM users 
    WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL
  `;
  const [rows] = await connection.query(query, [user_id, tenant_id]);
  return rows.length ? rows[0] : null;
}

/**
 * Helper to get a team assignment
 */
async function getTeamAssignment(audit_id, user_id, connection = pool) {
  const query = `
    SELECT audit_id, user_id, role_in_audit, created_at 
    FROM audit_auditors 
    WHERE audit_id = ? AND user_id = ?
  `;
  const [rows] = await connection.query(query, [audit_id, user_id]);
  return rows.length ? rows[0] : null;
}

/**
 * Assign user to audit team
 */
async function assignTeamMember(audit_id, user_id, role_in_audit, tenant_id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Verify audit
    const audit = await getAuditForTenant(audit_id, tenant_id, connection);
    if (!audit) {
      const err = new Error('Audit not found or does not belong to specified tenant');
      err.status = 404;
      throw err;
    }

    // 2. Verify user
    const user = await getUserForTenant(user_id, tenant_id, connection);
    if (!user) {
      const err = new Error('User not found or does not belong to specified tenant');
      err.status = 400;
      throw err;
    }

    // 3. Check existing assignment
    const existing = await getTeamAssignment(audit_id, user_id, connection);
    if (existing) {
      const err = new Error('User is already assigned to this audit');
      err.status = 409;
      throw err;
    }

    // 4. Handle LEAD_AUDITOR logic
    if (role_in_audit === 'LEAD_AUDITOR') {
      // Demote any existing LEAD_AUDITOR in audit_auditors for this audit to AUDITOR
      await connection.query(
        `UPDATE audit_auditors SET role_in_audit = 'AUDITOR' WHERE audit_id = ? AND role_in_audit = 'LEAD_AUDITOR'`,
        [audit_id]
      );

      // Insert new team member as LEAD_AUDITOR
      await connection.query(
        `INSERT INTO audit_auditors (audit_id, user_id, role_in_audit) VALUES (?, ?, ?)`,
        [audit_id, user_id, 'LEAD_AUDITOR']
      );

      // Update audits.lead_auditor_id
      await connection.query(
        `UPDATE audits SET lead_auditor_id = ? WHERE id = ? AND tenant_id = ?`,
        [user_id, audit_id, tenant_id]
      );
    } else {
      // Regular assignment
      await connection.query(
        `INSERT INTO audit_auditors (audit_id, user_id, role_in_audit) VALUES (?, ?, ?)`,
        [audit_id, user_id, role_in_audit]
      );
    }

    await connection.commit();

    const [assignmentRows] = await pool.query(
      `SELECT aa.audit_id, aa.user_id, u.first_name, u.last_name, u.email, aa.role_in_audit, aa.created_at
       FROM audit_auditors aa
       JOIN users u ON aa.user_id = u.id
       WHERE aa.audit_id = ? AND aa.user_id = ?`,
      [audit_id, user_id]
    );

    return assignmentRows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * List team members for an audit
 */
async function getAuditTeam(audit_id, tenant_id) {
  const audit = await getAuditForTenant(audit_id, tenant_id);
  if (!audit) {
    const err = new Error('Audit not found or does not belong to specified tenant');
    err.status = 404;
    throw err;
  }

  const query = `
    SELECT 
      aa.audit_id,
      aa.user_id,
      u.first_name,
      u.last_name,
      u.email,
      aa.role_in_audit,
      aa.created_at
    FROM audit_auditors aa
    JOIN users u ON aa.user_id = u.id
    WHERE aa.audit_id = ? AND u.tenant_id = ? AND u.deleted_at IS NULL
    ORDER BY 
      CASE aa.role_in_audit
        WHEN 'LEAD_AUDITOR' THEN 1
        WHEN 'AUDITOR' THEN 2
        WHEN 'SUBJECT_MATTER_EXPERT' THEN 3
        WHEN 'OBSERVER' THEN 4
        ELSE 5
      END,
      aa.created_at ASC
  `;

  const [rows] = await pool.query(query, [audit_id, tenant_id]);
  return rows;
}

/**
 * Update team member role
 */
async function updateTeamMemberRole(audit_id, user_id, new_role, tenant_id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const audit = await getAuditForTenant(audit_id, tenant_id, connection);
    if (!audit) {
      const err = new Error('Audit not found or does not belong to specified tenant');
      err.status = 404;
      throw err;
    }

    const assignment = await getTeamAssignment(audit_id, user_id, connection);
    if (!assignment) {
      const err = new Error('Team assignment not found for this user');
      err.status = 404;
      throw err;
    }

    const isCurrentLead = (Number(audit.lead_auditor_id) === Number(user_id)) || (assignment.role_in_audit === 'LEAD_AUDITOR');

    if (isCurrentLead && new_role !== 'LEAD_AUDITOR') {
      const err = new Error('Cannot demote the primary lead auditor. Assign another lead auditor first.');
      err.status = 400;
      throw err;
    }

    if (new_role === 'LEAD_AUDITOR') {
      // Demote existing lead auditor in audit_auditors
      await connection.query(
        `UPDATE audit_auditors SET role_in_audit = 'AUDITOR' WHERE audit_id = ? AND role_in_audit = 'LEAD_AUDITOR'`,
        [audit_id]
      );

      // Set role of target user
      await connection.query(
        `UPDATE audit_auditors SET role_in_audit = 'LEAD_AUDITOR' WHERE audit_id = ? AND user_id = ?`,
        [audit_id, user_id]
      );

      // Update audit lead_auditor_id
      await connection.query(
        `UPDATE audits SET lead_auditor_id = ? WHERE id = ? AND tenant_id = ?`,
        [user_id, audit_id, tenant_id]
      );
    } else {
      await connection.query(
        `UPDATE audit_auditors SET role_in_audit = ? WHERE audit_id = ? AND user_id = ?`,
        [new_role, audit_id, user_id]
      );
    }

    await connection.commit();

    const [rows] = await pool.query(
      `SELECT aa.audit_id, aa.user_id, u.first_name, u.last_name, u.email, aa.role_in_audit, aa.created_at
       FROM audit_auditors aa
       JOIN users u ON aa.user_id = u.id
       WHERE aa.audit_id = ? AND aa.user_id = ?`,
      [audit_id, user_id]
    );

    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Remove team member
 */
async function removeTeamMember(audit_id, user_id, tenant_id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const audit = await getAuditForTenant(audit_id, tenant_id, connection);
    if (!audit) {
      const err = new Error('Audit not found or does not belong to specified tenant');
      err.status = 404;
      throw err;
    }

    const assignment = await getTeamAssignment(audit_id, user_id, connection);
    if (!assignment) {
      const err = new Error('Team assignment not found for this user');
      err.status = 404;
      throw err;
    }

    const isCurrentLead = (Number(audit.lead_auditor_id) === Number(user_id)) || (assignment.role_in_audit === 'LEAD_AUDITOR');

    if (isCurrentLead) {
      const err = new Error('Cannot remove the primary lead auditor from the audit team. Reassign lead auditor first.');
      err.status = 400;
      throw err;
    }

    await connection.query(
      `DELETE FROM audit_auditors WHERE audit_id = ? AND user_id = ?`,
      [audit_id, user_id]
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  VALID_AUDIT_ROLES,
  getAuditForTenant,
  getUserForTenant,
  getTeamAssignment,
  assignTeamMember,
  getAuditTeam,
  updateTeamMemberRole,
  removeTeamMember
};
