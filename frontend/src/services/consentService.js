import { apiFetch } from './apiClient';

/**
 * Service to handle Consent & Privacy Management API network calls (JWT Authenticated)
 * Tenant ID is derived server-side from JWT token - never sent in requests.
 */

const API_BASE_URL = '/api';

// ==========================================
// CONSENT PURPOSE APIS
// ==========================================

export async function listPurposes(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.legal_basis) queryParams.append('legal_basis', params.legal_basis);
  if (params.search) queryParams.append('search', params.search);

  const queryString = queryParams.toString();
  const url = queryString ? `${API_BASE_URL}/consent-purposes?${queryString}` : `${API_BASE_URL}/consent-purposes`;

  const response = await apiFetch(url, { method: 'GET' });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function getPurpose(id) {
  const response = await apiFetch(`${API_BASE_URL}/consent-purposes/${id}`, { method: 'GET' });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function createPurpose(purposeData) {
  const response = await apiFetch(`${API_BASE_URL}/consent-purposes`, {
    method: 'POST',
    body: JSON.stringify(purposeData)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function updatePurpose(id, purposeData) {
  const response = await apiFetch(`${API_BASE_URL}/consent-purposes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(purposeData)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function archivePurpose(id) {
  const response = await apiFetch(`${API_BASE_URL}/consent-purposes/${id}`, {
    method: 'DELETE'
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

// ==========================================
// CONSENT RECORD APIS
// ==========================================

export async function listConsents(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.purpose_id) queryParams.append('purpose_id', params.purpose_id);
  if (params.data_subject_type) queryParams.append('data_subject_type', params.data_subject_type);
  if (params.data_subject_id) queryParams.append('data_subject_id', params.data_subject_id);
  if (params.user_id) queryParams.append('user_id', params.user_id);
  if (params.search) queryParams.append('search', params.search);

  const queryString = queryParams.toString();
  const url = queryString ? `${API_BASE_URL}/consents?${queryString}` : `${API_BASE_URL}/consents`;

  const response = await apiFetch(url, { method: 'GET' });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function getConsent(id) {
  const response = await apiFetch(`${API_BASE_URL}/consents/${id}`, { method: 'GET' });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function createConsent(consentData) {
  const response = await apiFetch(`${API_BASE_URL}/consents`, {
    method: 'POST',
    body: JSON.stringify(consentData)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function withdrawConsent(id, payload = {}) {
  const response = await apiFetch(`${API_BASE_URL}/consents/${id}/withdraw`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function getConsentHistory(id) {
  const response = await apiFetch(`${API_BASE_URL}/consents/${id}/history`, { method: 'GET' });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}
