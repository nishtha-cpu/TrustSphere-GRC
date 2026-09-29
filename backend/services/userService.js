const pool = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Sanitize user object to ensure password_hash and sensitive auth fields are NEVER returned.
 */
function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...sanitized } = user;
  return sanitized;
}

/**
 * List all users for authenticated tenant
 */
async function getUsers(tenantId) {
  const [rows] = await pool.query(
    `SELECT id, tenant_id, email, first_name, last_name, status, created_at, updated_at
     FROM users
     WHERE tenant_id = ? AND deleted_at IS NULL
     ORDER BY id ASC`,
    [tenantId]
  );
  return rows;
}

/**
 * Get single user by ID for authenticated tenant
 */
async function getUserById(tenantId, userId) {
  const [rows] = await pool.query(
    `SELECT id, tenant_id, email, first_name, last_name, status, created_at, updated_at
     FROM users
     WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
    [userId, tenantId]
  );

  if (rows.length === 0) return null;

  // Also fetch assigned roles
  const [roleRows] = await pool.query(
    `SELECT r.id, r.code, r.name
     FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = ? AND (r.tenant_id = ? OR r.tenant_id IS NULL)`,
    [userId, tenantId]
  );

  return {
    ...rows[0],
    roles: roleRows
  };
}

/**
 * Create a new user within authenticated tenant
 */
async function createUser(tenantId, data) {
  const { email, password, first_name, last_name, status = 'ACTIVE' } = data;

  if (!email || !email.trim()) {
    const err = new Error('Email is required');
    err.status = 400;
    throw err;
  }

  if (!password || password.length < 8) {
    const err = new Error('Password must be at least 8 characters long');
    err.status = 400;
    throw err;
  }

  if (!first_name || !first_name.trim() || !last_name || !last_name.trim()) {
    const err = new Error('First name and last name are required');
    err.status = 400;
    throw err;
  }

  const cleanEmail = email.trim().toLowerCase();

  // Validate tenant-scoped email uniqueness
  const [existing] = await pool.query(
    `SELECT id FROM users WHERE LOWER(email) = ? AND tenant_id = ? AND deleted_at IS NULL`,
    [cleanEmail, tenantId]
  );

  if (existing.length > 0) {
    const err = new Error('User with this email already exists in tenant');
    err.status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [tenantId, cleanEmail, passwordHash, first_name.trim(), last_name.trim(), status]
  );

  return await getUserById(tenantId, result.insertId);
}

/**
 * Update user details within authenticated tenant
 */
async function updateUser(tenantId, userId, data) {
  const existingUser = await getUserById(tenantId, userId);
  if (!existingUser) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const { first_name, last_name, email } = data;

  let updateFields = [];
  let updateParams = [];

  if (first_name !== undefined && first_name.trim()) {
    updateFields.push('first_name = ?');
    updateParams.push(first_name.trim());
  }

  if (last_name !== undefined && last_name.trim()) {
    updateFields.push('last_name = ?');
    updateParams.push(last_name.trim());
  }

  if (email !== undefined && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    const [dupCheck] = await pool.query(
      `SELECT id FROM users WHERE LOWER(email) = ? AND tenant_id = ? AND id != ? AND deleted_at IS NULL`,
      [cleanEmail, tenantId, userId]
    );
    if (dupCheck.length > 0) {
      const err = new Error('Email already in use by another user in tenant');
      err.status = 400;
      throw err;
    }
    updateFields.push('email = ?');
    updateParams.push(cleanEmail);
  }

  if (updateFields.length === 0) {
    return existingUser;
  }

  updateParams.push(userId, tenantId);

  await pool.query(
    `UPDATE users SET ${updateFields.join(', ')} WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
    updateParams
  );

  return await getUserById(tenantId, userId);
}

/**
 * Update user status within authenticated tenant
 */
async function updateUserStatus(tenantId, userId, status) {
  const existingUser = await getUserById(tenantId, userId);
  if (!existingUser) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const validStatuses = ['ACTIVE', 'INACTIVE', 'PENDING'];
  if (!status || !validStatuses.includes(status)) {
    const err = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    err.status = 400;
    throw err;
  }

  await pool.query(
    `UPDATE users SET status = ? WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
    [status, userId, tenantId]
  );

  return await getUserById(tenantId, userId);
}

/**
 * List available roles for authenticated tenant
 */
async function getRoles(tenantId) {
  const [rows] = await pool.query(
    `SELECT id, tenant_id, name, code, description
     FROM roles
     WHERE tenant_id = ? OR tenant_id IS NULL
     ORDER BY id ASC`,
    [tenantId]
  );
  return rows;
}

/**
 * Assign a role to a user within authenticated tenant
 */
async function assignUserRole(actingUserId, actingUserRoles, tenantId, targetUserId, roleId) {
  // 1. Self-privilege escalation check
  if (Number(actingUserId) === Number(targetUserId)) {
    const err = new Error('Forbidden: Users cannot modify their own roles');
    err.status = 403;
    throw err;
  }

  // 2. Ensure target user exists within authenticated tenant
  const targetUser = await getUserById(tenantId, targetUserId);
  if (!targetUser) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  // 3. Ensure role exists and is accessible within tenant context
  const [roleRows] = await pool.query(
    `SELECT id, tenant_id, code FROM roles WHERE id = ? AND (tenant_id = ? OR tenant_id IS NULL)`,
    [roleId, tenantId]
  );

  if (roleRows.length === 0) {
    const err = new Error('Role not found or inaccessible in tenant context');
    err.status = 400;
    throw err;
  }

  const targetRole = roleRows[0];

  // 4. Privilege escalation guard: Tenant Admin cannot assign SYSTEM_ADMIN role
  if (targetRole.code === 'SYSTEM_ADMIN' && !actingUserRoles.includes('SYSTEM_ADMIN')) {
    const err = new Error('Forbidden: Cannot assign SYSTEM_ADMIN role');
    err.status = 403;
    throw err;
  }

  // 5. Prevent duplicate assignment
  const [existingAssignment] = await pool.query(
    `SELECT user_id FROM user_roles WHERE user_id = ? AND role_id = ?`,
    [targetUserId, roleId]
  );

  if (existingAssignment.length > 0) {
    const err = new Error('Role is already assigned to user');
    err.status = 400;
    throw err;
  }

  await pool.query(
    `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
    [targetUserId, roleId]
  );

  return await getUserById(tenantId, targetUserId);
}

/**
 * Remove a role from a user within authenticated tenant
 */
async function removeUserRole(actingUserId, tenantId, targetUserId, roleId) {
  // 1. Self-privilege escalation check
  if (Number(actingUserId) === Number(targetUserId)) {
    const err = new Error('Forbidden: Users cannot modify their own roles');
    err.status = 403;
    throw err;
  }

  // 2. Ensure target user exists within authenticated tenant
  const targetUser = await getUserById(tenantId, targetUserId);
  if (!targetUser) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const [assignment] = await pool.query(
    `SELECT user_id FROM user_roles WHERE user_id = ? AND role_id = ?`,
    [targetUserId, roleId]
  );

  if (assignment.length === 0) {
    const err = new Error('Role assignment not found');
    err.status = 404;
    throw err;
  }

  await pool.query(
    `DELETE FROM user_roles WHERE user_id = ? AND role_id = ?`,
    [targetUserId, roleId]
  );

  return await getUserById(tenantId, targetUserId);
}

module.exports = {
  sanitizeUser,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  getRoles,
  assignUserRole,
  removeUserRole
};
