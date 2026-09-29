const userService = require('../services/userService');

/**
 * GET /api/users - List users for authenticated tenant
 */
async function getUsers(req, res) {
  try {
    const users = await userService.getUsers(req.user.tenantId);
    return res.status(200).json({ data: users });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/users/:id - Get user details by ID
 */
async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(req.user.tenantId, id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({ data: user });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error fetching user by ID:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/users - Create new user in tenant
 */
async function createUser(req, res) {
  try {
    const newUser = await userService.createUser(req.user.tenantId, req.body);
    return res.status(201).json({
      message: 'User created successfully',
      data: newUser
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/users/:id - Update user details
 */
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const updatedUser = await userService.updateUser(req.user.tenantId, id, req.body);
    return res.status(200).json({
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PATCH /api/users/:id/status - Update user status
 */
async function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const updatedUser = await userService.updateUserStatus(req.user.tenantId, id, status);
    return res.status(200).json({
      message: 'User status updated successfully',
      data: updatedUser
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error updating user status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/roles - List available roles for tenant
 */
async function getRoles(req, res) {
  try {
    const roles = await userService.getRoles(req.user.tenantId);
    return res.status(200).json({ data: roles });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error fetching roles:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/users/:id/roles - Get assigned roles for a user
 */
async function getUserRoles(req, res) {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(req.user.tenantId, id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({ data: user.roles || [] });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error fetching user roles:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/users/:id/roles - Assign role to user
 */
async function assignUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role_id } = req.body || {};

    if (!role_id) {
      return res.status(400).json({ error: 'role_id is required' });
    }

    const updatedUser = await userService.assignUserRole(
      req.user.userId,
      req.user.roles || [],
      req.user.tenantId,
      id,
      role_id
    );

    return res.status(201).json({
      message: 'Role assigned successfully',
      data: updatedUser
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error assigning user role:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/users/:id/roles/:roleId - Remove role from user
 */
async function removeUserRole(req, res) {
  try {
    const { id, roleId } = req.params;

    const updatedUser = await userService.removeUserRole(
      req.user.userId,
      req.user.tenantId,
      id,
      roleId
    );

    return res.status(200).json({
      message: 'Role removed successfully',
      data: updatedUser
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Error removing user role:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  getRoles,
  getUserRoles,
  assignUserRole,
  removeUserRole
};
