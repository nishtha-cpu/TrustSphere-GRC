import { apiFetch, setStoredSession, clearStoredSession, getStoredToken } from './apiClient';

/**
 * Authentication service communicating with /api/auth endpoints
 */

export async function login(email, password, tenantId = 1) {
  const payload = {
    email: email.trim(),
    password
  };

  if (tenantId !== null && tenantId !== undefined && tenantId !== '') {
    payload.tenant_id = Number(tenantId);
  }

  const response = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  const resData = await response.json();

  if (!response.ok) {
    const errorMsg = resData.error || 'Authentication failed';
    throw new Error(errorMsg);
  }

  const { user, token } = resData.data;

  // Store in sessionStorage
  setStoredSession(token, user);

  return { user, token };
}

export function logout() {
  clearStoredSession();
}

export function getCurrentUser() {
  const rawUser = sessionStorage.getItem('trustsphere_user');
  if (!rawUser) return null;
  try {
    return JSON.parse(rawUser);
  } catch (e) {
    return null;
  }
}

export function getToken() {
  return getStoredToken();
}

export async function fetchMe() {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const response = await apiFetch('/api/auth/me', {
      method: 'GET'
    });

    if (!response.ok) {
      clearStoredSession();
      return null;
    }

    const resData = await response.json();
    return resData.data.user;
  } catch (err) {
    clearStoredSession();
    return null;
  }
}

export default {
  login,
  logout,
  getCurrentUser,
  getToken,
  fetchMe
};
