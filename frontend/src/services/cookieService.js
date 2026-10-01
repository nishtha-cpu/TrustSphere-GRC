import { apiFetch } from './apiClient';

const API_BASE_URL = '/api/cookies';

export async function listCookies(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.category) queryParams.append('category', params.category);
  if (params.party_type) queryParams.append('party_type', params.party_type);
  if (params.search) queryParams.append('search', params.search);

  const url = queryParams.toString() ? `${API_BASE_URL}/inventory?${queryParams}` : `${API_BASE_URL}/inventory`;
  const res = await apiFetch(url, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to list cookie inventory');
  return data.data;
}

export async function addCookie(cookieData) {
  const res = await apiFetch(`${API_BASE_URL}/inventory`, {
    method: 'POST',
    body: JSON.stringify(cookieData)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to add cookie');
  return data.data;
}

export async function recordCookieConsent(consentData) {
  const res = await apiFetch(`${API_BASE_URL}/consent`, {
    method: 'POST',
    body: JSON.stringify(consentData)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to record cookie consent');
  return data.data;
}

export async function getCookieAnalytics() {
  const res = await apiFetch(`${API_BASE_URL}/analytics`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to get cookie analytics');
  return data.data;
}
