/**
 * Centralized API Client with automatic Bearer token injection and 401 handling
 */

export function getStoredToken() {
  return sessionStorage.getItem('trustsphere_token');
}

export function setStoredSession(token, user) {
  sessionStorage.setItem('trustsphere_token', token);
  sessionStorage.setItem('trustsphere_user', JSON.stringify(user));
}

export function clearStoredSession() {
  sessionStorage.removeItem('trustsphere_token');
  sessionStorage.removeItem('trustsphere_user');
}

export async function apiFetch(url, options = {}) {
  const token = getStoredToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);

    if (response.status === 401 && !url.includes('/api/auth/login')) {
      clearStoredSession();
      // Dispatch event to notify AuthContext to clear state without page reload loop
      window.dispatchEvent(new CustomEvent('auth_unauthorized'));
    }

    return response;
  } catch (error) {
    console.error(`API Fetch Error [${url}]:`, error);
    throw error;
  }
}
