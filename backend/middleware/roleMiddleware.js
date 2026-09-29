const pool = require('../config/database');

/**
 * Helper function to query fresh active roles for a user from the database.
 * Enforces tenant context isolation: role must belong to req.user.tenantId or be global (tenant_id IS NULL).
 */
async function getUserActiveRoles(userId, tenantId) {
  if (!userId || !tenantId) return [];
  const [roleRows] = await pool.query(
    `SELECT r.code 
     FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = ? AND (r.tenant_id = ? OR r.tenant_id IS NULL)`,
    [userId, tenantId]
  );
  return roleRows.map(r => r.code);
}

/**
 * Reusable RBAC Middleware Factory
 * Usage: requireRole('RISK_MANAGER', 'TENANT_ADMIN') or requireRole('RISK_MANAGER')
 *
 * 1. Checks if req.user exists (set by authMiddleware). Returns 401 if missing.
 * 2. Queries fresh database roles using req.user.userId & req.user.tenantId (enforces instant role revocation).
 * 3. Checks if user possesses any of the specified allowed roles.
 * 4. Returns 403 Forbidden if user lacks required role.
 * 5. Calls next() if authorized.
 */
function requireRole(...allowedRoles) {
  const flattenedRoles = allowedRoles.flat();

  return async (req, res, next) => {
    try {
      // 1. Ensure user is authenticated
      if (!req.user || !req.user.userId || !req.user.tenantId) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required' });
      }

      // 2. Fetch fresh roles from DB for authoritative tenant context
      const userRoles = await getUserActiveRoles(req.user.userId, req.user.tenantId);

      // 3. Verify role authorization
      const hasPermission = flattenedRoles.some(allowed => {
        if (userRoles.includes(allowed)) return true;
        // Support alias between RISK_MGR and RISK_MANAGER if applicable
        if (allowed === 'RISK_MANAGER' && userRoles.includes('RISK_MGR')) return true;
        if (allowed === 'RISK_MGR' && userRoles.includes('RISK_MANAGER')) return true;
        return false;
      });

      if (!hasPermission) {
        return res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
      }

      // Attach current db roles to req.user for downstream use
      req.user.roles = userRoles;

      next();
    } catch (err) {
      console.error('RBAC Middleware Authorization Error:', err);
      return res.status(500).json({ error: 'Internal server error during authorization check' });
    }
  };
}

/**
 * Alias for requireRole to support requireAnyRole syntax cleanly
 */
const requireAnyRole = requireRole;

module.exports = {
  requireRole,
  requireAnyRole,
  getUserActiveRoles
};
