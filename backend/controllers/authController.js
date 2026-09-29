const authService = require('../services/authService');

/**
 * Controller for Authentication endpoints
 */

async function login(req, res) {
  try {
    const { email, password, tenant_id } = req.body || {};

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!password || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const result = await authService.loginUser(email, password, tenant_id);

    return res.status(200).json({
      message: 'Login successful',
      data: {
        user: result.user,
        token: result.token
      }
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error during authentication login:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function me(req, res) {
  try {
    const profile = await authService.getAuthenticatedUserProfile(req.user.userId, req.user.tenantId);

    if (!profile) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    return res.status(200).json({
      data: {
        user: profile
      }
    });
  } catch (error) {
    console.error('Error fetching authenticated user context:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function changePassword(req, res) {
  try {
    const { current_password, new_password } = req.body || {};

    if (!current_password) {
      return res.status(400).json({ error: 'Current password is required' });
    }

    if (!new_password || typeof new_password !== 'string' || new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const result = await authService.changePassword(
      req.user.userId,
      req.user.tenantId,
      current_password,
      new_password
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Error in changePassword controller:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  login,
  me,
  changePassword
};

