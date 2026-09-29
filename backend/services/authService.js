const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

function getJwtSecret() {
  return process.env.JWT_SECRET || 'trustsphere_dev_jwt_secret_key_2026_super_secure!';
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '1h';
}

/**
 * Hash a plain text password using bcrypt
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compare a plain text password against a bcrypt hash
 */
async function comparePassword(password, passwordHash) {
  if (!password || !passwordHash) return false;
  return await bcrypt.compare(password, passwordHash);
}

/**
 * Generate a JWT token for authenticated identity
 */
function generateToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn() });
}

/**
 * Verify a JWT token
 */
function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

/**
 * Authenticate a user by credentials, return sanitized profile AND signed JWT token
 */
async function loginUser(email, password, tenant_id = null) {
  // 1. Basic input validation
  if (!email || typeof email !== 'string' || !email.trim()) {
    const err = new Error('Email is required');
    err.status = 400;
    throw err;
  }

  if (!password || typeof password !== 'string' || !password) {
    const err = new Error('Password is required');
    err.status = 400;
    throw err;
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    const err = new Error('Invalid email format');
    err.status = 400;
    throw err;
  }

  const invalidCredentialsError = () => {
    const err = new Error('Invalid email or password');
    err.status = 401;
    return err;
  };

  // 2. Query user by email
  let userQuery = `
    SELECT id, tenant_id, email, password_hash, first_name, last_name, status, deleted_at 
    FROM users 
    WHERE LOWER(email) = ? AND deleted_at IS NULL
  `;
  const queryParams = [cleanEmail];

  if (tenant_id !== null && tenant_id !== undefined && tenant_id !== '') {
    const parsedTenantId = Number(tenant_id);
    if (isNaN(parsedTenantId) || parsedTenantId <= 0) {
      const err = new Error('Invalid tenant_id format');
      err.status = 400;
      throw err;
    }
    userQuery += ` AND tenant_id = ?`;
    queryParams.push(parsedTenantId);
  }

  const [userRows] = await pool.query(userQuery, queryParams);

  if (userRows.length === 0 || userRows.length > 1) {
    throw invalidCredentialsError();
  }

  const user = userRows[0];

  // 3. Ensure user status is ACTIVE
  if (user.status !== 'ACTIVE') {
    throw invalidCredentialsError();
  }

  // 4. Verify associated tenant exists and is ACTIVE
  const [tenantRows] = await pool.query(
    `SELECT id, status FROM tenants WHERE id = ? AND deleted_at IS NULL`,
    [user.tenant_id]
  );

  if (tenantRows.length === 0 || tenantRows[0].status !== 'ACTIVE') {
    throw invalidCredentialsError();
  }

  // 5. Verify password hash using bcrypt
  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    throw invalidCredentialsError();
  }

  // 6. Load user's assigned roles
  const [roleRows] = await pool.query(
    `SELECT r.id, r.code, r.name 
     FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = ? AND (r.tenant_id = ? OR r.tenant_id IS NULL)`,
    [user.id, user.tenant_id]
  );

  const roleCodes = roleRows.map(r => r.code);
  const roles = roleRows.map(r => ({
    id: r.id,
    code: r.code,
    name: r.name
  }));

  // 7. Generate JWT token (containing userId, tenantId, email, roles)
  const tokenPayload = {
    userId: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    roles: roleCodes
  };

  const token = generateToken(tokenPayload);

  // 8. Return sanitized user object and JWT token
  const sanitizedUser = {
    id: user.id,
    tenant_id: user.tenant_id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    roles: roles
  };

  return {
    user: sanitizedUser,
    token: token
  };
}

/**
 * Get authenticated user profile by validating user & tenant active state in database
 * Used by GET /api/auth/me to enforce active server-side state check.
 */
async function getAuthenticatedUserProfile(userId, tenantId) {
  // Query user
  const [userRows] = await pool.query(
    `SELECT id, tenant_id, email, first_name, last_name, status, deleted_at 
     FROM users 
     WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
    [userId, tenantId]
  );

  if (userRows.length === 0 || userRows[0].status !== 'ACTIVE') {
    return null;
  }

  const user = userRows[0];

  // Query tenant
  const [tenantRows] = await pool.query(
    `SELECT id, status FROM tenants WHERE id = ? AND deleted_at IS NULL`,
    [tenantId]
  );

  if (tenantRows.length === 0 || tenantRows[0].status !== 'ACTIVE') {
    return null;
  }

  // Load roles
  const [roleRows] = await pool.query(
    `SELECT r.id, r.code, r.name 
     FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = ? AND (r.tenant_id = ? OR r.tenant_id IS NULL)`,
    [user.id, user.tenant_id]
  );

  const roles = roleRows.map(r => ({
    id: r.id,
    code: r.code,
    name: r.name
  }));

  return {
    userId: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    roles: roles
  };
}

/**
 * Change password for authenticated user
 */
async function changePassword(userId, tenantId, currentPassword, newPassword) {
  if (!currentPassword) {
    const err = new Error('Current password is required');
    err.status = 400;
    throw err;
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    const err = new Error('New password must be at least 8 characters long');
    err.status = 400;
    throw err;
  }

  // Fetch user from DB
  const [userRows] = await pool.query(
    `SELECT id, password_hash, status FROM users WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
    [userId, tenantId]
  );

  if (userRows.length === 0 || userRows[0].status !== 'ACTIVE') {
    const err = new Error('User not found or inactive');
    err.status = 404;
    throw err;
  }

  const user = userRows[0];

  // Verify current password using bcrypt
  const isMatch = await comparePassword(currentPassword, user.password_hash);
  if (!isMatch) {
    const err = new Error('Incorrect current password');
    err.status = 401;
    throw err;
  }

  // Hash new password using bcrypt
  const newPasswordHash = await hashPassword(newPassword);

  // Update in DB
  await pool.query(
    `UPDATE users SET password_hash = ? WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
    [newPasswordHash, userId, tenantId]
  );

  return { message: 'Password changed successfully' };
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  loginUser,
  getAuthenticatedUserProfile,
  changePassword
};

