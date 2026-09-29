const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

// POST /api/auth/login - Authenticate user credentials & issue JWT (Public)
router.post('/login', authController.login);

// GET /api/auth/me - Fetch authenticated user context (Protected)
router.get('/me', authMiddleware, authController.me);

// PUT /api/auth/change-password - Change user password (Protected)
router.put('/change-password', authMiddleware, authController.changePassword);

module.exports = router;

