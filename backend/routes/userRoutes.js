const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Mount authMiddleware on all User & Role Management routes
router.use(authMiddleware);

// Roles List Route (TENANT_ADMIN, SYSTEM_ADMIN)
router.get('/roles', requireRole('TENANT_ADMIN', 'SYSTEM_ADMIN'), userController.getRoles);

// User Management Endpoints (TENANT_ADMIN, SYSTEM_ADMIN)
router.get('/users', requireRole('TENANT_ADMIN', 'SYSTEM_ADMIN'), userController.getUsers);
router.post('/users', requireRole('TENANT_ADMIN', 'SYSTEM_ADMIN'), userController.createUser);

router.get('/users/:id', requireRole('TENANT_ADMIN', 'SYSTEM_ADMIN'), userController.getUserById);
router.put('/users/:id', requireRole('TENANT_ADMIN', 'SYSTEM_ADMIN'), userController.updateUser);
router.patch('/users/:id/status', requireRole('TENANT_ADMIN', 'SYSTEM_ADMIN'), userController.updateUserStatus);

// Role Assignment Management Endpoints (TENANT_ADMIN, SYSTEM_ADMIN)
router.get('/users/:id/roles', requireRole('TENANT_ADMIN', 'SYSTEM_ADMIN'), userController.getUserRoles);
router.post('/users/:id/roles', requireRole('TENANT_ADMIN', 'SYSTEM_ADMIN'), userController.assignUserRole);
router.delete('/users/:id/roles/:roleId', requireRole('TENANT_ADMIN', 'SYSTEM_ADMIN'), userController.removeUserRole);

module.exports = router;
